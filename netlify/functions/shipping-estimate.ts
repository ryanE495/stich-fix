/**
 * POST /api/shipping-estimate — round-trip ground shipping estimate.
 *
 * Netlify Function (v2). The rest of the site stays statically built; this is
 * the only server code, so no Astro adapter is needed.
 *
 * Request:  { zip, length, width, height, weight }   inches, pounds
 * Response: { lowUsd, highUsd, source: 'live' | 'roughly' }
 *
 * - Rates from EasyPost (POST /v2/shipments), shop ZIP 81425 → customer ZIP.
 *   Addresses are ZIP + country only; no street address is needed to rate.
 * - EasyPost parcel weight is in OUNCES; dimensions are in inches.
 * - Ground services only, cheapest one, round trip = 2×, high end padded 15%.
 *   It's a range on purpose: the real rate is confirmed on the phone.
 * - Live results are cached per (zone, box) for 24 hours, in memory. The cache
 *   is per warm function instance, so a cold start simply re-rates.
 * - ANY failure (no key, carrier error, timeout, no ground rates) returns the
 *   static zone-table estimate with source "roughly" and HTTP 200. A shipping
 *   problem must never block a request.
 *
 * Env: EASYPOST_KEY — set in Netlify (Site configuration → Environment
 * variables). Use a test key (EZTK…) until launch. Server-only: never prefix
 * it with VITE_ and never send it to the browser.
 */

import { CARRIER_LIMITS, ORIGIN_ZIP, SHIPPING_ESTIMATE } from '../../src/config/mail-in-intake';
import { isValidZip, matchPresetId, measurePackage } from '../../src/lib/mail-in/rules';
import { approximateZone, roughShippingEstimate, toEstimateRange } from '../../src/lib/mail-in/shipping-zones';
import type { ShippingEstimate, ShippingEstimateRequest } from '../../src/lib/mail-in/types';

const EASYPOST_SHIPMENTS_URL = 'https://api.easypost.com/v2/shipments';
/** USPS GroundAdvantage, UPS Ground, FEDEX_GROUND, GROUND_HOME_DELIVERY, etc. */
const GROUND_SERVICE = /ground/i;
const MAX_DIMENSION_IN = 108;
const MAX_CACHE_ENTRIES = 500;

interface Deps {
  apiKey: string | undefined;
  fetch: typeof fetch;
  now: () => number;
  log: (message: string) => void;
}

type CacheEntry = { expiresAt: number; estimate: ShippingEstimate };
const cache = new Map<string, CacheEntry>();

// ---- Netlify entry point --------------------------------------------------

export default async function handler(req: Request): Promise<Response> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return handleShippingEstimate(req, {
    apiKey: env.EASYPOST_KEY,
    fetch: globalThis.fetch.bind(globalThis),
    now: Date.now,
    log: (message) => console.error(`[shipping-estimate] ${message}`),
  });
}

export const config = { path: '/api/shipping-estimate' };

// ---- Handler (dependency-injected for tests) --------------------------------

export async function handleShippingEstimate(req: Request, deps: Deps): Promise<Response> {
  if (req.method !== 'POST') {
    return json({ error: 'Use POST.' }, 405, { Allow: 'POST' });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Request body must be JSON.' }, 400);
  }

  const parsed = parseRequest(body);
  if ('error' in parsed) return json({ error: parsed.error }, 400);
  const input = parsed.request;

  const pkg = measurePackage(input.length, input.width, input.height, input.weight);
  if (pkg.blocked) {
    return json({ error: 'That box is over carrier parcel limits.' }, 422);
  }

  const { zone } = approximateZone(input.zip);
  const cacheKey = `${zone}|${matchPresetId(input) ?? `custom:${pkg.dimsIn.join('x')}@${pkg.actualWeightLb}`}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > deps.now()) return json(cached.estimate);

  if (!deps.apiKey) {
    deps.log('EASYPOST_KEY is not set; returning zone-table estimate.');
    return json(roughShippingEstimate(input));
  }

  try {
    const cheapestOneWay = await cheapestGroundRate(input, pkg.dimsIn, deps);
    const estimate = toEstimateRange(cheapestOneWay * 2, 'live');
    remember(cacheKey, estimate, deps.now());
    return json(estimate);
  } catch (err) {
    deps.log(`Falling back to zone table: ${(err as Error).message}`);
    return json(roughShippingEstimate(input));
  }
}

// ---- EasyPost ----------------------------------------------------------------

interface EasyPostRate {
  carrier?: string;
  service?: string;
  rate?: string;
  currency?: string;
}

async function cheapestGroundRate(input: ShippingEstimateRequest, dimsIn: [number, number, number], deps: Deps): Promise<number> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHIPPING_ESTIMATE.carrierTimeoutMs);
  try {
    const res = await deps.fetch(EASYPOST_SHIPMENTS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${deps.apiKey}:`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shipment: {
          from_address: { zip: ORIGIN_ZIP, country: 'US' },
          to_address: { zip: input.zip, country: 'US' },
          parcel: {
            length: dimsIn[0],
            width: dimsIn[1],
            height: dimsIn[2],
            // EasyPost wants OUNCES. Actual weight — the carrier applies dimensional weight itself.
            weight: Math.ceil(input.weight * 16),
          },
        },
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`EasyPost HTTP ${res.status}`);

    const data = (await res.json()) as { rates?: EasyPostRate[] };
    const ground = (data.rates ?? [])
      .filter((r) => GROUND_SERVICE.test(r.service ?? '') && (r.currency ?? 'USD') === 'USD')
      .map((r) => Number.parseFloat(r.rate ?? ''))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ground.length === 0) throw new Error('EasyPost returned no ground rates');
    return Math.min(...ground);
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw new Error(`EasyPost timed out after ${SHIPPING_ESTIMATE.carrierTimeoutMs} ms`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ---- helpers -------------------------------------------------------------------

function parseRequest(body: unknown): { request: ShippingEstimateRequest } | { error: string } {
  if (typeof body !== 'object' || body === null) return { error: 'Expected an object.' };
  const b = body as Record<string, unknown>;
  const zip = typeof b.zip === 'string' ? b.zip.trim() : '';
  if (!isValidZip(zip)) return { error: 'zip must be a 5-digit US ZIP code.' };

  const nums: Record<'length' | 'width' | 'height' | 'weight', number> = { length: 0, width: 0, height: 0, weight: 0 };
  for (const key of ['length', 'width', 'height', 'weight'] as const) {
    const n = b[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return { error: `${key} must be a positive number.` };
    nums[key] = n;
  }
  if (Math.max(nums.length, nums.width, nums.height) > MAX_DIMENSION_IN) return { error: `No side can be over ${MAX_DIMENSION_IN} inches.` };
  if (nums.weight > CARRIER_LIMITS.maxParcelWeightLb) return { error: `weight can’t be over ${CARRIER_LIMITS.maxParcelWeightLb} lb.` };

  return { request: { zip, ...nums } };
}

function remember(key: string, estimate: ShippingEstimate, now: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: now + SHIPPING_ESTIMATE.cacheHours * 60 * 60 * 1000, estimate });
}

/** Test hook: clear the in-memory rate cache. */
export function clearRateCache() {
  cache.clear();
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
