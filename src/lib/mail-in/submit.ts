/**
 * Sends a finished repair request to Supabase, in this order:
 *
 *   1. submit_repair_request(payload)  → { id, request_number }   the lead is saved here
 *   2. upload each photo to repair-photos/{id}/{slot}.jpg
 *   3. attach_repair_photo(...) for each upload that made it
 *
 * Only step 1 can fail the submission. Photo problems are logged (no customer
 * details) and reported back so the confirmation can say I may ask for them.
 *
 * Uses the public anon key only. Anon can't read, update, or delete anything:
 * it can call the two RPCs and upload into a request made in the last 15 minutes.
 *
 * supabase-js is imported on first submit so the form's initial JS stays small.
 */

import { REQUEST_SUBMIT } from '../../config/mail-in-intake';
import { FIELD_STEP, PHOTO_SLOT_DB_NAME } from './repair-request-payload';
import type { PhotoSlotId, RepairRequestRpcPayload, SubmitFailure, SubmitResult } from './types';

export interface SupabaseTarget {
  url: string;
  anonKey: string;
}

export class SubmitError extends Error {
  readonly failure: SubmitFailure;
  constructor(failure: SubmitFailure) {
    super(`Repair request not saved (${failure.kind})`);
    this.name = 'SubmitError';
    this.failure = failure;
  }
}

interface RpcErrorLike {
  code?: string;
  message?: string;
  details?: string;
}

export async function submitRepairRequest(
  target: SupabaseTarget | null,
  body: RepairRequestRpcPayload,
  photos: Record<PhotoSlotId, File>,
): Promise<SubmitResult> {
  if (!target) throw new SubmitError({ kind: 'unavailable' });

  let supabase: Awaited<ReturnType<typeof createSupabase>>;
  try {
    supabase = await createSupabase(target);
  } catch {
    // The chunk didn't load — almost always a dropped connection.
    throw new SubmitError({ kind: 'network' });
  }

  // 1. Save the request. Retrying with the same client_submission_id returns the same row.
  const { data, error, status } = await supabase.rpc('submit_repair_request', { payload: body });
  if (error) throw new SubmitError(classifyRpcError(error, status));
  const row = (Array.isArray(data) ? data[0] : data) as { id?: string; request_number?: string } | null;
  if (!row?.id || !row.request_number) throw new SubmitError({ kind: 'unavailable' });
  const requestId = row.id;

  // 2 + 3. Photos, in parallel. Never throws.
  const slots = Object.keys(photos) as PhotoSlotId[];
  const outcomes = await Promise.all(
    slots.map(async (slot) => {
      const dbSlot = PHOTO_SLOT_DB_NAME[slot];
      const path = `${requestId}/${dbSlot}.jpg`;
      const file = withImageType(photos[slot]);
      try {
        const upload = await supabase.storage
          .from(REQUEST_SUBMIT.storageBucket)
          .upload(path, file, { contentType: file.type, upsert: false });
        // A retry after a lost response finds the photo already there; that's fine.
        if (upload.error && !isAlreadyUploaded(upload.error)) {
          console.warn(`[mail-in] photo upload failed (${dbSlot}):`, upload.error.message);
          return slot;
        }
        const attach = await supabase.rpc('attach_repair_photo', {
          request_id: requestId,
          slot: dbSlot,
          storage_path: path,
        });
        if (attach.error) {
          console.warn(`[mail-in] photo attach failed (${dbSlot}):`, attach.error.message);
          return slot;
        }
        return null;
      } catch (err) {
        console.warn(`[mail-in] photo upload failed (${dbSlot}):`, err instanceof Error ? err.message : err);
        return slot;
      }
    }),
  );

  return {
    requestId,
    requestNumber: row.request_number,
    photoFailures: outcomes.filter((s): s is PhotoSlotId => s !== null),
  };
}

export function classifyRpcError(error: RpcErrorLike, status: number): SubmitFailure {
  // postgrest-js reports a failed fetch (offline, timeout, CORS) as status 0 with no code.
  if (status === 0 || !error.code) return { kind: 'network' };
  if (error.code === '22023') {
    const field = error.details ?? '';
    if (field === 'spam_check') return { kind: 'spam' };
    return {
      kind: 'rejected',
      field,
      step: FIELD_STEP[field] ?? null,
      message: error.message || 'Something in the form didn’t come through correctly.',
    };
  }
  return { kind: 'unavailable' };
}

/**
 * Storage takes the type from the file itself, and the bucket only accepts image
 * types. Some browsers report HEIC (and files with odd names) as "" or
 * application/octet-stream, so fill in the type from the extension.
 */
export function withImageType(file: File): File {
  if (file.type.startsWith('image/')) return file;
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const type =
    ({ heic: 'image/heic', heif: 'image/heif', png: 'image/png', webp: 'image/webp' } as Record<string, string>)[ext] ??
    'image/jpeg';
  return new File([file], file.name, { type });
}

function isAlreadyUploaded(error: { message?: string; statusCode?: unknown; status?: unknown }): boolean {
  return (
    String(error.statusCode) === '409' ||
    error.status === 409 ||
    /already exists|duplicate/i.test(error.message ?? '')
  );
}

async function createSupabase(target: SupabaseTarget) {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(target.url, target.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: fetchWithTimeout },
  });
}

/** fetch with a hard timeout: long for photo uploads, short for everything else. */
function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const ms = url.includes('/storage/v1/') ? REQUEST_SUBMIT.photoTimeoutMs : REQUEST_SUBMIT.rpcTimeoutMs;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), ms);
  const outer = init.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener('abort', () => controller.abort(), { once: true });
  }
  return fetch(input, { ...init, signal: controller.signal }).finally(() => window.clearTimeout(timer));
}
