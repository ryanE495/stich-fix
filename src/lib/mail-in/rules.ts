/**
 * Business rules for the mail-in repair request form.
 *
 * Pure functions only — no DOM, no network. The controller calls these; the
 * markup never encodes a rule. Estimate math, carrier packaging math,
 * validation, and the payload shape all live here. Also imported by the
 * shipping-estimate Netlify Function, so keep it free of browser APIs.
 */

import {
  BOX_PRESETS,
  CARRIER_LIMITS,
  CATEGORIES,
  CONTACT_METHODS,
  CUSTOM_BOX_ID,
  FLEXIBLE_WEEK_ID,
  MAX_SEAT_QUANTITY,
  MINIMUM_USD,
  PHOTO_SLOTS,
  PRICE_BANDS,
} from '../../config/mail-in-intake';
import type {
  CategoryId,
  ContactMethod,
  IntakePayload,
  IntakeState,
  PackageAssessment,
  PhotoSlotId,
  RepairEstimate,
  SendWeekOption,
  ShippingEstimate,
  ShippingEstimateRequest,
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
    terms: { cleanDry: false, spendCeiling: '', ifUnrepairable: '', replacementValue: '' },
    shipping: {
      zip: '',
      addressType: '',
      presetId: '',
      length: '',
      width: '',
      height: '',
      weight: '',
      sendWeekId: '',
    },
    contact: { name: '', phone: '', email: '', method: '', bestTime: '', foundVia: '', foundViaDetail: '' },
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

/** Shipping range as shown to the customer; fallback estimates are labeled "roughly". */
export function formatShippingEstimate(est: ShippingEstimate): string {
  const range = formatUsdRange(est.lowUsd, est.highUsd);
  return est.source === 'roughly' ? `Roughly ${range}` : range;
}

export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** US phone: 10 digits, or 11 starting with 1. Returns the 10 digits or null. */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

export function formatPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(raw.trim());
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

/** Repair range + shipping range, widened outward to whole dollars so it never understates. */
export function combinedEstimateRange(repairLow: number, repairHigh: number, shipping: ShippingEstimate): { low: number; high: number } {
  return {
    low: Math.floor(repairLow + shipping.lowUsd),
    high: Math.ceil(repairHigh + shipping.highUsd),
  };
}

// ---------------------------------------------------------------------------
// Packaging math (step 6) — real carrier rules
// ---------------------------------------------------------------------------

/**
 * Carriers measure the longest side as length and the other two as girth:
 * length + 2 × (width + height). Dimensions round up to the next whole inch
 * and weights round up to the next pound before billing. Invalid or missing
 * numbers pass as null/0 and mark the result incomplete.
 */
export function measurePackage(length: number | null, width: number | null, height: number | null, weight: number | null): PackageAssessment {
  const raw = [length, width, height];
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

/** Same as measurePackage, from the form's raw strings. */
export function assessPackage(shipping: IntakeState['shipping']): PackageAssessment {
  return measurePackage(toNumber(shipping.length), toNumber(shipping.width), toNumber(shipping.height), toNumber(shipping.weight));
}

/** The body for POST /api/shipping-estimate, or null until ZIP, address type, and box are valid. */
export function buildEstimateRequest(state: IntakeState): ShippingEstimateRequest | null {
  const { shipping } = state;
  const pkg = assessPackage(shipping);
  const weight = toNumber(shipping.weight);
  if (!isValidZip(shipping.zip) || !shipping.addressType || !pkg.complete || pkg.blocked || weight === null) return null;
  return {
    zip: shipping.zip.trim(),
    length: pkg.dimsIn[0],
    width: pkg.dimsIn[1],
    height: pkg.dimsIn[2],
    weight,
    residential: shipping.addressType === 'residential',
  };
}

/** Stable key for an estimate request, so stale results can be detected. */
export function estimateRequestKey(req: ShippingEstimateRequest): string {
  return JSON.stringify(req);
}

export function presetFor(category: CategoryId | '', presetId: string) {
  if (!category) return undefined;
  return BOX_PRESETS[category].find((p) => p.id === presetId);
}

/** Which preset a set of numbers matches exactly (any category), for cache keys. */
export function matchPresetId(req: ShippingEstimateRequest): string | null {
  const dims = [req.length, req.width, req.height].sort((a, b) => b - a).join('x');
  for (const presets of Object.values(BOX_PRESETS)) {
    for (const p of presets) {
      const pDims = [p.lengthIn, p.widthIn, p.heightIn].sort((a, b) => b - a).join('x');
      if (pDims === dims && Math.ceil(req.weight) === p.weightLb) return p.id;
    }
  }
  return null;
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

  const value = toNumber(terms.replacementValue);
  if (terms.replacementValue.trim() === '') {
    errors['terms.replacementValue'] = 'Enter a rough replacement cost. A ballpark is fine.';
  } else if (value === null || value <= 0) {
    errors['terms.replacementValue'] = 'Enter a dollar amount greater than zero, like 2000.';
  }
}

const DIM_LABELS = { length: 'length', width: 'width', height: 'height' } as const;

/**
 * Shipping never waits on rates: a missing or slow estimate can't block
 * Continue. The only hard stops are bad measurements and the carrier limits.
 */
function validateShipping(state: IntakeState, errors: Errors) {
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

  const week = shipping.sendWeekId;
  if (!week || (week !== FLEXIBLE_WEEK_ID && !/^\d{4}-\d{2}-\d{2}$/.test(week))) {
    errors['shipping.sendWeekId'] = 'Pick when you’re hoping to send it, or choose “I’m flexible.”';
  }
}

function validateContact(state: IntakeState, errors: Errors) {
  const { contact } = state;
  requireText(errors, 'contact.name', contact.name, 'Enter your name.');

  if (contact.phone.trim() === '') errors['contact.phone'] = 'Enter a phone number. I call every customer before anything ships.';
  else if (!normalizePhone(contact.phone)) errors['contact.phone'] = 'Enter a 10-digit phone number with the area code, like (970) 555-0123.';

  if (contact.email.trim() === '') errors['contact.email'] = 'Enter your email address.';
  else if (!isValidEmail(contact.email)) errors['contact.email'] = 'That email looks incomplete. Check for a missing @ or dot, like name@example.com.';

  if (!CONTACT_METHODS.some((m) => m.id === contact.method)) errors['contact.method'] = 'Choose how you’d like me to reach you.';
  if (!contact.bestTime) errors['contact.bestTime'] = 'Choose the best time to reach you.';
}

const LAST_INPUT_STEP = 7;

export function validateStep(step: StepNumber, state: IntakeState): StepValidation {
  const errors: Errors = {};
  switch (step) {
    case 1: validateCategory(state, errors); break;
    case 2: validateDetails(state, errors); break;
    case 3: validateDamage(state, errors); break;
    case 4: validatePhotos(state, errors); break;
    case 5: validateTerms(state, errors); break;
    case 6: validateShipping(state, errors); break;
    case 7: validateContact(state, errors); break;
    case 8:
      for (let s = 1; s <= LAST_INPUT_STEP; s++) {
        if (!validateStep(s as StepNumber, state).valid) errors[`step${s}`] = `Step ${s} still needs attention.`;
      }
      break;
  }
  const messages = Object.values(errors);
  return { valid: messages.length === 0, errors, firstError: messages[0] ?? null };
}

/** First input step (1–7) after `after` that doesn't validate, or null if all do. */
export function firstInvalidStep(state: IntakeState, after = 0): StepNumber | null {
  for (let s = after + 1; s <= LAST_INPUT_STEP; s++) {
    if (!validateStep(s as StepNumber, state).valid) return s as StepNumber;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Payload
// ---------------------------------------------------------------------------

/**
 * Build the submission payload. Throws if the form isn't complete.
 * `shipping` is whatever estimate is current (live or roughly) — never null,
 * because a missing rate must not block submission.
 */
export function buildPayload(state: IntakeState, shipping: ShippingEstimate, sendWeeks: SendWeekOption[]): IntakePayload {
  const invalid = firstInvalidStep(state);
  if (invalid !== null) throw new Error(`Request form incomplete at step ${invalid}`);

  const category = state.category as CategoryId;
  const estimate = estimateRepair(state);
  const pkg = assessPackage(state.shipping);
  const ceiling = toNumber(state.terms.spendCeiling);
  const total = combinedEstimateRange(estimate.low, estimate.high, shipping);
  const week = sendWeeks.find((w) => w.id === state.shipping.sendWeekId) ?? { id: state.shipping.sendWeekId, label: state.shipping.sendWeekId };

  const item: Record<string, string | number> = { ...state.details[category] };
  if (category === 'seat') item.quantity = seatQuantity(state);

  const { contact } = state;
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
      replacementValueUsd: toNumber(state.terms.replacementValue)!,
    },
    shipping: {
      destinationZip: state.shipping.zip.trim(),
      addressType: state.shipping.addressType as 'residential' | 'business',
      boxPresetId: state.shipping.presetId,
      box: { lengthIn: pkg.dimsIn[0], widthIn: pkg.dimsIn[1], heightIn: pkg.dimsIn[2] },
      actualWeightLb: pkg.actualWeightLb,
      dimensionalWeightLb: pkg.dimensionalWeightLb,
      billableWeightLb: pkg.billableWeightLb,
      estimate: shipping,
      sendWeek: week,
    },
    contact: {
      name: contact.name.trim(),
      phone: formatPhone(normalizePhone(contact.phone)!),
      email: contact.email.trim(),
      method: contact.method as ContactMethod,
      bestTime: contact.bestTime,
      foundVia: contact.foundVia || null,
      foundViaDetail: contact.foundViaDetail.trim() || null,
    },
    estimate: {
      repairLowUsd: estimate.low,
      repairHighUsd: estimate.high,
      shippingLowUsd: shipping.lowUsd,
      shippingHighUsd: shipping.highUsd,
      totalLowUsd: total.low,
      totalHighUsd: total.high,
    },
  };
}
