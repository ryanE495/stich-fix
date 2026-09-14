/**
 * Types for the mail-in repair intake form (/mail-in-repair/start).
 *
 * Form state holds raw input strings; parsing and every business rule live in
 * rules.ts. The payload is what a future submit handler sends to the backend.
 */

export type CategoryId = 'tent' | 'shade' | 'seat' | 'other';
export type PhotoSlotId = 'overall' | 'damage' | 'tag';
export type AddressType = 'residential' | 'business';
export type UnrepairableChoice = 'return' | 'dispose';
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Option<T extends string = string> {
  id: T;
  label: string;
  hint?: string;
}

export interface PriceBand {
  id: string;
  label: string;
  low: number;
  high: number;
  hint?: string;
}

export interface BoxPreset {
  id: string;
  label: string;
  hint: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLb: number;
}

// ---------------------------------------------------------------------------
// Form state — raw strings exactly as typed
// ---------------------------------------------------------------------------

export interface IntakeState {
  category: CategoryId | '';
  details: {
    tent: { type: string; size: string; age: string; brand: string };
    shade: { type: string; dimensions: string; brand: string };
    seat: { type: string; makeModelYear: string; sending: string; quantity: string };
    other: { description: string; size: string };
  };
  damage: Record<CategoryId, string[]>;
  damageNotes: Record<CategoryId, string>;
  photos: Record<PhotoSlotId, File | null>;
  terms: {
    cleanDry: boolean;
    spendCeiling: string;
    ifUnrepairable: UnrepairableChoice | '';
    declaredValue: string;
  };
  shipping: {
    zip: string;
    addressType: AddressType | '';
    presetId: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    intakeWeekId: string;
  };
}

// ---------------------------------------------------------------------------
// Async data the form depends on (rates, intake weeks)
// ---------------------------------------------------------------------------

export interface RateRequest {
  originZip: string;
  destinationZip: string;
  residential: boolean;
  box: { lengthIn: number; widthIn: number; heightIn: number };
  billableWeightLb: number;
  declaredValueUsd: number;
}

export interface RateLeg {
  amountUsd: number;
  insuranceUsd: number;
  description: string;
}

export interface RateQuote {
  toShop: RateLeg;
  toCustomer: RateLeg;
  roundTripUsd: number;
  /** Customer-facing note about where the numbers come from. */
  note: string;
}

export type RateStatus =
  | { state: 'idle' }
  | { state: 'loading'; key: string }
  | { state: 'ready'; key: string; quote: RateQuote }
  | { state: 'error'; key: string };

export interface IntakeWeek {
  /** Monday of the week, YYYY-MM-DD. */
  id: string;
  label: string;
  capacity: number;
  remaining: number;
}

export type WeeksStatus =
  | { state: 'loading' }
  | { state: 'ready'; weeks: IntakeWeek[] }
  | { state: 'error' };

export interface RuleContext {
  rates: RateStatus;
  weeks: WeeksStatus;
}

// ---------------------------------------------------------------------------
// Derived results
// ---------------------------------------------------------------------------

export interface StepValidation {
  valid: boolean;
  /** Keyed by field name (matches the input's name attribute). */
  errors: Record<string, string>;
  /** First problem, in field order — used for the hint next to Continue. */
  firstError: string | null;
}

export interface RepairEstimate {
  items: PriceBand[];
  /** Seat jobs multiply by quantity; 1 otherwise. */
  quantity: number;
  low: number;
  high: number;
  minimumApplied: boolean;
  caseByCase: boolean;
  hasNotes: boolean;
}

export interface PackageAssessment {
  complete: boolean;
  /** Rounded up to whole inches, longest side first. */
  dimsIn: [number, number, number];
  lengthPlusGirthIn: number;
  volumeCubicIn: number;
  actualWeightLb: number;
  dimensionalWeightLb: number;
  billableWeightLb: number;
  dimensionalApplies: boolean;
  overLengthPlusGirth: boolean;
  overVolume: boolean;
  overWeight: boolean;
  blocked: boolean;
}

// ---------------------------------------------------------------------------
// Submission payload
// ---------------------------------------------------------------------------

export interface IntakePayload {
  submittedAt: string;
  category: CategoryId;
  item: Record<string, string | number>;
  damage: {
    items: PriceBand[];
    notes: string;
  };
  photos: Record<PhotoSlotId, File>;
  terms: {
    cleanAndDryAttested: true;
    spendCeilingUsd: number | null;
    ifUnrepairable: UnrepairableChoice;
    declaredValueUsd: number;
  };
  shipping: {
    originZip: string;
    destinationZip: string;
    addressType: AddressType;
    boxPresetId: string;
    box: { lengthIn: number; widthIn: number; heightIn: number };
    actualWeightLb: number;
    dimensionalWeightLb: number;
    billableWeightLb: number;
    rates: RateQuote;
  };
  intakeWeek: IntakeWeek;
  estimate: {
    repairLowUsd: number;
    repairHighUsd: number;
    shippingRoundTripUsd: number;
    totalLowUsd: number;
    totalHighUsd: number;
  };
}

export interface SubmitResult {
  reference: string;
}
