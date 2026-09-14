/**
 * Business rules for the mail-in intake form.
 *
 * Pure functions only — no DOM, no network. The controller calls these; the
 * markup never encodes a rule. Estimate math, carrier packaging math,
 * validation, and the payload shape all live here.
 */

import {
  BOX_PRESETS,
  CARRIER_LIMITS,
  CATEGORIES,
  CUSTOM_BOX_ID,
  MAX_SEAT_QUANTITY,
  MINIMUM_USD,
  ORIGIN_ZIP,
  PHOTO_SLOTS,
  PRICE_BANDS,
} from '../../config/mail-in-intake';
import type {
  CategoryId,
  IntakePayload,
  IntakeState,
  PackageAssessment,
  PhotoSlotId,
  RateRequest,
  RepairEstimate,
  RuleContext,
  StepNumber,
  StepValidation,
} from './types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function createInitialState(): IntakeState {
  return {
    category: '',
    details: {
      tent: { type: '', size: '', age: '', brand: '' },
      shade: { type: '', dimensions: '', brand: '' },
      seat: { type: '', makeModelYear: '', sending: '', quantity: '1' },
      other: { description: '', size: '' },
    },
    damage: { tent: [], shade: [], seat: [], other: [] },
    damageNotes: { tent: '', shade: '', seat: '', other: '' },
    photos: { overall: null, damage: null, tag: null },
    terms: { cleanDry: false, spendCeiling: '', ifUnrepairable: '', declaredValue: '' },
    shipping: {
      zip: '',
      addressType: '',
      presetId: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      intakeWeekId: '',
    },
  };
}

export function isCategory(value: string): value is CategoryId {
  return CATEGORIES.some((c) => c.id === value);
}

// ---------------------------------------------------------------------------
// Parsing & formatting
// ---------------------------------------------------------------------------

/** Parse a typed number or dollar amount ("$1,200", "12.5"). null if not a finite number. */
export function toNumber(raw: string): number | null {
  const cleaned = raw.trim().replace(/[$,\s]/g, '');
  if (cleaned === '') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function formatUsd(n: number): string {
  const whole = Number.isInteger(n);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  });
}

export function formatUsdRange(low: number, high: number): string {
  return low === high ? formatUsd(low) : `${formatUsd(low)} – ${formatUsd(high)}`;
}

/**
 * Repair estimate plus round-trip shipping, widened outward to whole dollars
 * for display (low rounds down, high rounds up) so it never understates.
 * The payload keeps the exact figures.
 */
export function combinedEstimateRange(repairLow: number, repairHigh: number, shippingRoundTrip: number): { low: number; high: number } {
  return {
    low: Math.floor(repairLow + shippingRoundTrip),
    high: Math.ceil(repairHigh + shippingRoundTrip),
  };
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** Accepts anything the browser calls an image, plus HEIC/HEIF (often typed as "" on Windows). */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(heic|heif|jpe?g|png|webp|gif|avif)$/i.test(file.name);
}

/** Browsers can't draw HEIC/HEIF, so previews fall back to the file name. */
export function canPreviewImage(file: File): boolean {
  return !/\.(heic|heif)$/i.test(file.name) && !/hei[cf]/i.test(file.type);
}

// ---------------------------------------------------------------------------
// Repair estimate (step 3)
// ---------------------------------------------------------------------------

export function seatQuantity(state: IntakeState): number {
  const n = toNumber(state.details.seat.quantity);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= MAX_SEAT_QUANTITY ? n : 1;
}

/**
 * Sum the checked price bands, multiply by seat count for seats, then floor
 * both ends at the mail-in minimum. Free-text damage isn't priced.
 */
export function estimateRepair(state: IntakeState): RepairEstimate {
  const category = state.category;
  if (!category) {
    return { items: [], quantity: 1, low: MINIMUM_USD, high: MINIMUM_USD, minimumApplied: true, caseByCase: false, hasNotes: false };
  }
  const bands = PRICE_BANDS[category];
  const selected = new Set(state.damage[category]);
  const items = bands.filter((b) => selected.has(b.id));
  const quantity = category === 'seat' ? seatQuantity(state) : 1;
  const sumLow = items.reduce((t, b) => t + b.low, 0) * quantity;
  const sumHigh = items.reduce((t, b) => t + b.high, 0) * quantity;
  return {
    items,
    quantity,
    low: Math.max(sumLow, MINIMUM_USD),
    high: Math.max(sumHigh, MINIMUM_USD),
    minimumApplied: sumLow < MINIMUM_USD,
    caseByCase: bands.length === 0,
    hasNotes: state.damageNotes[category].trim() !== '',
  };
}

// ---------------------------------------------------------------------------
// Packaging math (step 6) — real carrier rules, not stubs
// ---------------------------------------------------------------------------

/**
 * Carriers measure the longest side as length and the other two as girth:
 * length + 2 × (width + height). Dimensions round up to the next whole inch
 * and weights round up to the next pound before billing.
 */
export function assessPackage(shipping: IntakeState['shipping']): PackageAssessment {
  const raw = [toNumber(shipping.length), toNumber(shipping.width), toNumber(shipping.height)];
  const weight = toNumber(shipping.weight);
  const complete = raw.every((n) => n !== null && n > 0) && weight !== null && weight > 0;

  const dims = raw.map((n) => (n !== null && n > 0 ? Math.ceil(n) : 0)).sort((a, b) => b - a) as [number, number, number];
  const [l, w, h] = dims;
  const lengthPlusGirthIn = l + 2 * (w + h);
  const volumeCubicIn = l * w * h;
  const actualWeightLb = weight !== null && weight > 0 ? Math.ceil(weight) : 0;
  const dimensionalWeightLb = Math.ceil(volumeCubicIn / CARRIER_LIMITS.dimDivisor);
  const billableWeightLb = Math.max(actualWeightLb, dimensionalWeightLb);

  const overLengthPlusGirth = complete && lengthPlusGirthIn > CARRIER_LIMITS.maxLengthPlusGirthIn;
  const overVolume = complete && volumeCubicIn > CARRIER_LIMITS.maxVolumeCubicIn;
  const overWeight = complete && actualWeightLb > CARRIER_LIMITS.maxParcelWeightLb;

  return {
    complete,
    dimsIn: dims,
    lengthPlusGirthIn,
    volumeCubicIn,
    actualWeightLb,
    dimensionalWeightLb,
    billableWeightLb,
    dimensionalApplies: complete && dimensionalWeightLb > actualWeightLb,
    overLengthPlusGirth,
    overVolume,
    overWeight,
    blocked: overLengthPlusGirth || overVolume || overWeight,
  };
}

/** Everything the rate lookup needs, or null until those inputs are valid. */
export function buildRateRequest(state: IntakeState): RateRequest | null {
  const { shipping } = state;
  const declared = toNumber(state.terms.declaredValue);
  const pkg = assessPackage(shipping);
  if (!isValidZip(shipping.zip) || !shipping.addressType || !pkg.complete || pkg.blocked) return null;
  if (declared === null || declared <= 0) return null;
  return {
    originZip: ORIGIN_ZIP,
    destinationZip: shipping.zip.trim(),
    residential: shipping.addressType === 'residential',
    box: { lengthIn: pkg.dimsIn[0], widthIn: pkg.dimsIn[1], heightIn: pkg.dimsIn[2] },
    billableWeightLb: pkg.billableWeightLb,
    declaredValueUsd: declared,
  };
}

/** Stable key for a rate request, so stale results can be detected. */
export function rateRequestKey(req: RateRequest): string {
  return JSON.stringify(req);
}

export function presetFor(category: CategoryId | '', presetId: string) {
  if (!category) return undefined;
  return BOX_PRESETS[category].find((p) => p.id === presetId);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

type Errors = Record<string, string>;

function requireText(errors: Errors, name: string, value: string, message: string) {
  if (value.trim() === '') errors[name] = message;
}

function validateCategory(state: IntakeState, errors: Errors) {
  if (!state.category) errors.category = 'Choose what you’re sending.';
}

function validateDetails(state: IntakeState, errors: Errors) {
  const { details } = state;
  switch (state.category) {
    case 'tent':
      requireText(errors, 'details.tent.type', details.tent.type, 'Choose the kind of tent.');
      requireText(errors, 'details.tent.size', details.tent.size, 'Enter the size, like 12 × 14. Put “not sure” if you don’t know.');
      requireText(errors, 'details.tent.age', details.tent.age, 'Choose roughly how old it is.');
      break;
    case 'shade':
      requireText(errors, 'details.shade.type', details.shade.type, 'Choose the kind of shade or awning.');
      requireText(errors, 'details.shade.dimensions', details.shade.dimensions, 'Enter rough dimensions, like 16 ft × 8 ft.');
      break;
    case 'seat': {
      requireText(errors, 'details.seat.type', details.seat.type, 'Choose the kind of seat.');
      requireText(errors, 'details.seat.makeModelYear', details.seat.makeModelYear, 'Enter the make, model, and year. Put “not sure” for anything you don’t know.');
      requireText(errors, 'details.seat.sending', details.seat.sending, 'Choose what you’re sending.');
      const q = toNumber(details.seat.quantity);
      if (q === null || !Number.isInteger(q) || q < 1 || q > MAX_SEAT_QUANTITY) {
        errors['details.seat.quantity'] = `Enter how many seats, as a whole number from 1 to ${MAX_SEAT_QUANTITY}.`;
      }
      break;
    }
    case 'other':
      requireText(errors, 'details.other.description', details.other.description, 'Tell me what the item is.');
      requireText(errors, 'details.other.size', details.other.size, 'Enter a rough size, like 6 ft × 4 ft.');
      break;
    default:
      errors.category = 'Go back to step 1 and choose what you’re sending.';
  }
}

function validateDamage(state: IntakeState, errors: Errors) {
  const category = state.category;
  if (!category) {
    errors.category = 'Go back to step 1 and choose what you’re sending.';
    return;
  }
  const checked = state.damage[category];
  const notes = state.damageNotes[category].trim();

  if (PRICE_BANDS[category].length === 0) {
    if (!notes) errors[`damageNotes.${category}`] = 'Describe the damage so I can quote it.';
    return;
  }
  if (checked.length === 0 && !notes) {
    errors[`damage.${category}`] = 'Check at least one repair, or describe the damage in the box below.';
    return;
  }
  // A pan can't be repaired if it isn't in the box.
  if (category === 'seat' && checked.includes('base-pan-repair') && state.details.seat.sending !== 'whole-seat') {
    errors['damage.seat'] = 'Pan repair needs the pan. Uncheck base or pan repair, or go back to step 2 and choose “Whole seat with pan.”';
  }
}

const PHOTO_MISSING: Record<PhotoSlotId, string> = {
  overall: 'Add a photo of the whole item.',
  damage: 'Add a close-up photo of the damage.',
  tag: 'Add a photo of the manufacturer’s tag, or where it would be.',
};

function validatePhotos(state: IntakeState, errors: Errors) {
  for (const slot of PHOTO_SLOTS) {
    if (!state.photos[slot.id]) errors[`photos.${slot.id}`] = PHOTO_MISSING[slot.id];
  }
}

function validateTerms(state: IntakeState, errors: Errors) {
  const { terms } = state;
  if (!terms.cleanDry) errors['terms.cleanDry'] = 'Check the box to confirm it will ship clean and completely dry.';

  if (terms.spendCeiling.trim() !== '') {
    const ceiling = toNumber(terms.spendCeiling);
    if (ceiling === null) {
      errors['terms.spendCeiling'] = 'Enter a dollar amount, like 400, or leave it blank.';
    } else if (ceiling < MINIMUM_USD) {
      errors['terms.spendCeiling'] = `Enter ${formatUsd(MINIMUM_USD)} or more, or leave it blank. Every mail-in job has a ${formatUsd(MINIMUM_USD)} minimum.`;
    }
  }

  if (!terms.ifUnrepairable) errors['terms.ifUnrepairable'] = 'Choose what happens if it can’t be repaired.';

  const declared = toNumber(terms.declaredValue);
  if (terms.declaredValue.trim() === '') {
    errors['terms.declaredValue'] = 'Enter what it would cost to replace. This sets the insurance on the shipping label.';
  } else if (declared === null || declared <= 0) {
    errors['terms.declaredValue'] = 'Enter a dollar amount greater than zero, like 2000.';
  }
}

const DIM_LABELS = { length: 'length', width: 'width', height: 'height' } as const;

function validateShipping(state: IntakeState, ctx: RuleContext, errors: Errors) {
  const { shipping } = state;

  if (shipping.zip.trim() === '') errors['shipping.zip'] = 'Enter your ZIP code.';
  else if (!isValidZip(shipping.zip)) errors['shipping.zip'] = 'Enter a 5-digit US ZIP code, like 81425.';

  if (!shipping.addressType) errors['shipping.addressType'] = 'Choose residential or business.';

  if (!shipping.presetId || (shipping.presetId !== CUSTOM_BOX_ID && !presetFor(state.category, shipping.presetId))) {
    errors['shipping.presetId'] = 'Pick a box size, or choose “I’ll measure mine.”';
  }

  for (const key of ['length', 'width', 'height'] as const) {
    const n = toNumber(shipping[key]);
    if (shipping[key].trim() === '') errors[`shipping.${key}`] = `Enter the ${DIM_LABELS[key]} in inches.`;
    else if (n === null || n <= 0) errors[`shipping.${key}`] = `Enter the ${DIM_LABELS[key]} as a number of inches greater than zero.`;
  }
  const w = toNumber(shipping.weight);
  if (shipping.weight.trim() === '') errors['shipping.weight'] = 'Enter the packed weight in pounds.';
  else if (w === null || w <= 0) errors['shipping.weight'] = 'Enter the weight as a number of pounds greater than zero.';

  const pkg = assessPackage(shipping);
  if (pkg.overWeight) {
    errors.package = `Over ${CARRIER_LIMITS.maxParcelWeightLb} lb won’t ship as a parcel. Split it into two boxes and enter the heavier one.`;
  } else if (pkg.overLengthPlusGirth || pkg.overVolume) {
    errors.package = 'This box is over the carrier’s size limit. Make it smaller and measure again.';
  }

  if (toNumber(state.terms.declaredValue) === null) {
    errors.rates = 'Go back to step 5 and enter a declared value. Shipping insurance depends on it.';
  } else if (!errors.package && buildRateRequest(state)) {
    const key = rateRequestKey(buildRateRequest(state)!);
    const r = ctx.rates;
    if (r.state === 'error' && r.key === key) errors.rates = 'Couldn’t get shipping rates. Check your ZIP and try again.';
    else if (r.state !== 'ready' || r.key !== key) errors.rates = 'Getting shipping rates for your address.';
  }

  if (ctx.weeks.state === 'loading') {
    errors['shipping.intakeWeekId'] = 'Loading open intake weeks.';
  } else if (ctx.weeks.state === 'error') {
    errors['shipping.intakeWeekId'] = 'Couldn’t load intake weeks. Try again.';
  } else {
    const week = ctx.weeks.weeks.find((wk) => wk.id === shipping.intakeWeekId);
    if (!week) errors['shipping.intakeWeekId'] = 'Pick an intake week.';
    else if (week.remaining <= 0) errors['shipping.intakeWeekId'] = 'That week is full. Pick another one.';
  }
}

export function validateStep(step: StepNumber, state: IntakeState, ctx: RuleContext): StepValidation {
  const errors: Errors = {};
  switch (step) {
    case 1: validateCategory(state, errors); break;
    case 2: validateDetails(state, errors); break;
    case 3: validateDamage(state, errors); break;
    case 4: validatePhotos(state, errors); break;
    case 5: validateTerms(state, errors); break;
    case 6: validateShipping(state, ctx, errors); break;
    case 7:
      for (const s of [1, 2, 3, 4, 5, 6] as const) {
        if (!validateStep(s, state, ctx).valid) errors[`step${s}`] = `Step ${s} still needs attention.`;
      }
      break;
  }
  const messages = Object.values(errors);
  return { valid: messages.length === 0, errors, firstError: messages[0] ?? null };
}

/** First step (1–6) that doesn't validate, or null if all do. */
export function firstInvalidStep(state: IntakeState, ctx: RuleContext, after = 0): StepNumber | null {
  for (const s of [1, 2, 3, 4, 5, 6] as const) {
    if (s > after && !validateStep(s, state, ctx).valid) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/** Build the submission payload. Throws if the form isn't complete. */
export function buildPayload(state: IntakeState, ctx: RuleContext): IntakePayload {
  const invalid = firstInvalidStep(state, ctx);
  if (invalid !== null) throw new Error(`Intake form incomplete at step ${invalid}`);
  if (ctx.rates.state !== 'ready' || ctx.weeks.state !== 'ready') throw new Error('Rates or intake weeks not loaded');

  const category = state.category as CategoryId;
  const estimate = estimateRepair(state);
  const pkg = assessPackage(state.shipping);
  const quote = ctx.rates.quote;
  const week = ctx.weeks.weeks.find((w) => w.id === state.shipping.intakeWeekId)!;
  const ceiling = toNumber(state.terms.spendCeiling);

  const item: Record<string, string | number> = { ...state.details[category] };
  if (category === 'seat') item.quantity = seatQuantity(state);

  return {
    submittedAt: new Date().toISOString(),
    category,
    item,
    damage: { items: estimate.items, notes: state.damageNotes[category].trim() },
    photos: state.photos as Record<PhotoSlotId, File>,
    terms: {
      cleanAndDryAttested: true,
      spendCeilingUsd: ceiling,
      ifUnrepairable: state.terms.ifUnrepairable as 'return' | 'dispose',
      declaredValueUsd: toNumber(state.terms.declaredValue)!,
    },
    shipping: {
      originZip: ORIGIN_ZIP,
      destinationZip: state.shipping.zip.trim(),
      addressType: state.shipping.addressType as 'residential' | 'business',
      boxPresetId: state.shipping.presetId,
      box: { lengthIn: pkg.dimsIn[0], widthIn: pkg.dimsIn[1], heightIn: pkg.dimsIn[2] },
      actualWeightLb: pkg.actualWeightLb,
      dimensionalWeightLb: pkg.dimensionalWeightLb,
      billableWeightLb: pkg.billableWeightLb,
      rates: quote,
    },
    intakeWeek: week,
    estimate: {
      repairLowUsd: estimate.low,
      repairHighUsd: estimate.high,
      shippingRoundTripUsd: quote.roundTripUsd,
      totalLowUsd: estimate.low + quote.roundTripUsd,
      totalHighUsd: estimate.high + quote.roundTripUsd,
    },
  };
}
