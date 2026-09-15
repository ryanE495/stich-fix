/**
 * Types for the mail-in repair request form (/mail-in-repair/start).
 *
 * This is a request form, not a checkout: every customer gets a call before a
 * label goes out. Form state holds raw input strings; parsing and every
 * business rule live in rules.ts.
 */

export type CategoryId = 'tent' | 'shade' | 'seat' | 'other';
export type PhotoSlotId = 'overall' | 'damage' | 'tag';
export type AddressType = 'residential' | 'business';
export type UnrepairableChoice = 'return' | 'dispose';
export type ContactMethod = 'phone' | 'email';
export type StepNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

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
    /** Rough replacement cost. Qualification for the call, not insurance. */
    replacementValue: string;
  };
  shipping: {
    zip: string;
    addressType: AddressType | '';
    presetId: string;
    length: string;
    width: string;
    height: string;
    weight: string;
    /** Monday of the preferred week (YYYY-MM-DD), or FLEXIBLE_WEEK_ID. A preference, not a booking. */
    sendWeekId: string;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
    method: ContactMethod | '';
    bestTime: string;
    foundVia: string;
    foundViaDetail: string;
  };
}

// ---------------------------------------------------------------------------
// Shipping estimate
// ---------------------------------------------------------------------------

/** Body of POST /api/shipping-estimate. Inches and pounds (the server converts to ounces). */
export interface ShippingEstimateRequest {
  zip: string;
  length: number;
  width: number;
  height: number;
  /** Actual packed weight in pounds — NOT billable weight; carriers apply dim weight themselves. */
  weight: number;
  /** Delivery to a home. Carriers add a residential surcharge (~$6.50 per package). */
  residential: boolean;
}

/**
 * Round-trip shipping as a range. `live` = from EasyPost ground rates;
 * `roughly` = from the static zone table (no key, API error, or timeout).
 */
export interface ShippingEstimate {
  lowUsd: number;
  highUsd: number;
  source: 'live' | 'roughly';
}

export type EstimateStatus =
  | { state: 'idle' }
  | { state: 'loading'; key: string }
  | { state: 'ready'; key: string; estimate: ShippingEstimate };

export interface SendWeekOption {
  id: string;
  label: string;
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
    replacementValueUsd: number;
  };
  shipping: {
    destinationZip: string;
    addressType: AddressType;
    boxPresetId: string;
    box: { lengthIn: number; widthIn: number; heightIn: number };
    actualWeightLb: number;
    dimensionalWeightLb: number;
    billableWeightLb: number;
    estimate: ShippingEstimate;
    /** Preferred send week — confirmed on the call. */
    sendWeek: SendWeekOption;
  };
  contact: {
    name: string;
    phone: string;
    email: string;
    method: ContactMethod;
    bestTime: string;
    foundVia: string | null;
    foundViaDetail: string | null;
  };
  estimate: {
    repairLowUsd: number;
    repairHighUsd: number;
    shippingLowUsd: number;
    shippingHighUsd: number;
    totalLowUsd: number;
    totalHighUsd: number;
  };
}

/** What a successful submit returns. The lead is saved even if photos fail. */
export interface SubmitResult {
  requestId: string;
  /** e.g. WSS-0042 — read over the phone. */
  requestNumber: string;
  /** Photo slots that didn't upload or attach. Empty when all three made it. */
  photoFailures: PhotoSlotId[];
}

/** Why a submit didn't save. The form keeps every answer in all cases. */
export type SubmitFailure =
  /** Couldn't reach Supabase (offline, timeout). Safe to retry as-is. */
  | { kind: 'network' }
  /** The database rejected a field. `step` is where the customer can fix it. */
  | { kind: 'rejected'; field: string; step: StepNumber | null; message: string }
  /** Tripped the spam checks. */
  | { kind: 'spam' }
  /** Server-side problem or missing config; not the customer's fault. */
  | { kind: 'unavailable' };

/** Body of the submit_repair_request RPC. Column names match public.repair_requests. */
export interface RepairRequestRpcPayload {
  category: CategoryId;
  item_details: Record<string, string | number>;
  damage_types: string[];
  damage_notes: string | null;
  repair_estimate_low: number;
  repair_estimate_high: number;
  clean_dry_confirmed: true;
  spend_ceiling: number | null;
  if_unrepairable: UnrepairableChoice;
  replacement_value: number;
  ship_zip: string;
  ship_residential: boolean;
  box_length: number;
  box_width: number;
  box_height: number;
  box_weight: number;
  billable_weight: number;
  shipping_estimate_low: number;
  shipping_estimate_high: number;
  estimate_source: 'table' | 'easypost';
  timing_preference: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  contact_method: ContactMethod;
  contact_best_time: string;
  referral_source: string | null;
  referral_detail: string | null;
  /** The form state, with photo Files replaced by name/type/size (Files can't be serialized). */
  raw_payload: Record<string, unknown>;
  // Anti-abuse & idempotency (not stored as columns, except client_submission_id)
  client_submission_id: string;
  form_elapsed_ms: number;
  website: string;
}
