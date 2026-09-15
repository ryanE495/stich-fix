/**
 * Maps a finished form into the body of the submit_repair_request RPC.
 *
 * Pure — no network, no DOM. Estimates are passed through exactly as the
 * customer saw them; the database must never recompute them.
 * Never includes status, internal_notes, request_number, or id (and the RPC
 * ignores them anyway).
 */

import type { IntakePayload, IntakeState, PhotoSlotId, RepairRequestRpcPayload, StepNumber } from './types';

/** Form photo slot → storage/database slot name. */
export const PHOTO_SLOT_DB_NAME: Record<PhotoSlotId, 'full' | 'damage' | 'tag'> = {
  overall: 'full',
  damage: 'damage',
  tag: 'tag',
};

/** Where each database field is answered, so a rejection can send the customer back. */
export const FIELD_STEP: Record<string, StepNumber> = {
  category: 1,
  item_details: 2,
  damage_types: 3,
  damage_notes: 3,
  repair_estimate_low: 3,
  repair_estimate_high: 3,
  clean_dry_confirmed: 5,
  spend_ceiling: 5,
  if_unrepairable: 5,
  replacement_value: 5,
  ship_zip: 6,
  ship_residential: 6,
  box_length: 6,
  box_width: 6,
  box_height: 6,
  box_weight: 6,
  billable_weight: 6,
  shipping_estimate_low: 6,
  shipping_estimate_high: 6,
  estimate_source: 6,
  timing_preference: 6,
  contact_name: 7,
  contact_phone: 7,
  contact_email: 7,
  contact_method: 7,
  contact_best_time: 7,
  referral_source: 7,
  referral_detail: 7,
};

export function buildRepairRequestPayload(
  payload: IntakePayload,
  state: IntakeState,
  meta: { clientSubmissionId: string; formElapsedMs: number; honeypot: string },
): RepairRequestRpcPayload {
  return {
    category: payload.category,
    item_details: payload.item,
    damage_types: payload.damage.items.map((i) => i.id),
    damage_notes: payload.damage.notes || null,
    repair_estimate_low: payload.estimate.repairLowUsd,
    repair_estimate_high: payload.estimate.repairHighUsd,
    clean_dry_confirmed: true,
    spend_ceiling: payload.terms.spendCeilingUsd === null ? null : Math.round(payload.terms.spendCeilingUsd),
    if_unrepairable: payload.terms.ifUnrepairable,
    replacement_value: Math.round(payload.terms.replacementValueUsd),
    ship_zip: payload.shipping.destinationZip,
    ship_residential: payload.shipping.addressType === 'residential',
    box_length: payload.shipping.box.lengthIn,
    box_width: payload.shipping.box.widthIn,
    box_height: payload.shipping.box.heightIn,
    box_weight: payload.shipping.actualWeightLb,
    billable_weight: payload.shipping.billableWeightLb,
    // Already whole dollars; floor/ceil matches how the range was shown if not.
    shipping_estimate_low: Math.floor(payload.estimate.shippingLowUsd),
    shipping_estimate_high: Math.ceil(payload.estimate.shippingHighUsd),
    estimate_source: payload.shipping.estimate.source === 'live' ? 'easypost' : 'table',
    timing_preference: payload.shipping.sendWeek.id,
    contact_name: payload.contact.name,
    contact_phone: payload.contact.phone,
    contact_email: payload.contact.email,
    contact_method: payload.contact.method,
    contact_best_time: payload.contact.bestTime,
    referral_source: payload.contact.foundVia,
    referral_detail: payload.contact.foundViaDetail,
    raw_payload: serializeFormState(state),
    client_submission_id: meta.clientSubmissionId,
    form_elapsed_ms: Math.round(meta.formElapsedMs),
    website: meta.honeypot,
  };
}

/** The form state as-is, except photo Files become { name, type, size }. */
export function serializeFormState(state: IntakeState): Record<string, unknown> {
  const photos: Record<string, { name: string; type: string; size: number } | null> = {};
  for (const [slot, file] of Object.entries(state.photos)) {
    photos[slot] = file ? { name: file.name, type: file.type, size: file.size } : null;
  }
  return { ...state, photos };
}

/** "WSS-0042" → "W S S, zero zero four two" — how to read it over the phone. */
export function spokenRequestNumber(requestNumber: string): string {
  const words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const [prefix, digits = ''] = requestNumber.split('-');
  const letters = prefix.split('').join(' ');
  const spokenDigits = digits.split('').map((d) => words[Number(d)] ?? d).join(' ');
  return spokenDigits ? `${letters}, ${spokenDigits}` : letters;
}
