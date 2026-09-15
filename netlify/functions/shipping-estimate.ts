/**
 * POST /api/shipping-estimate — round-trip ground shipping estimate.
 *
 * Netlify Function (v2). The rest of the site stays statically built; this is
 * the only server code, so no Astro adapter is needed.
 *
 * Request:  { zip, length, width, height, weight, residential }   inches, pounds, boolean
 * Response: { lowUsd, highUsd, source: 'live' | 'roughly' }
 *
 * - Rates from EasyPost (POST /v2/shipments), shop ZIP 81425 → customer ZIP.
 *   Addresses are ZIP + country only (plus the residential flag on the
 *   customer's address); no street address is needed to rate.
 * - EasyPost parcel weight is in OUNCES; dimensions are in inches.
 * - Ground services only, cheapest one, round trip = 2×, high end padded 15%.
 *   It's a range on purpose: the real rate is confirmed on the phone.
 * - Live results are cached for 24 hours per (destination ZIP prefix,
 *   residential, box), in memory. The prefix is the raw first 3 ZIP digits —
 *   not a derived zone — so e.g. 902xx and 981xx never share a rate. The
 *   cache is per warm function instance; a cold start simply re-rates.
 * - Rate limited to SHIPPING_ESTIMATE.rateLimitPerHour EasyPost lookups per
 *   client IP. Cache hits don't count. Over the limit, the static estimate is
 *   returned instead of an error. Like the cache, the limiter lives in
 *   instance memory, so it's a per-instance cap rather than a global one.
 * - ANY failure (no key, carrier error, timeout, no ground rates, rate limit)
 *   returns the static zone-table estimate with source "roughly" and HTTP 200.
 *   A shipping problem must never block a request.
 *
 * Env: EASYPOST_KEY — set in Netlify (Site configuration → Environment
 * variables). Use a test key (EZTK…) until launch. Server-only: never prefix
 * it with VITE_ and never send it to the browser.
 */

import { CARRIER_LIMITS, ORIGIN_ZIP, SHIPPING_ESTIMATE } from '../../src/config/mail-in-intake';
import { isValidZip, matchPresetId, measurePackage } from '../../src/lib/mail-in/rules';
import { roughShippingEstimate, toEstimateRange } from '../../src/lib/mail-in/shipping-zones';
import type { ShippingEstimate, ShippingEstimateRequest } from '../../src/lib/mail-in/types';

const EASYPOST_SHIPMENTS_URL = 'https://api.easypost.com/v2/shipments';
/** USPS GroundAdvantage, UPS Ground, FEDEX_GROUND, GROUND_HOME_DELIVERY, etc. */
const GROUND_SERVICE = /ground/i;
const MAX_DIMENSION_IN = 108;
const MAX_CACHE_ENTRIES = 500;
const MAX_TRACKED_IPS = 5_000;
const HOUR_MS = 60 * 60 * 1000;

interface Deps {
  apiKey: string | undefined;
  fetch: typeof fetch;
  now: () => number;
  log: (message: string) => void;
}

type CacheEntry = { expiresAt: number; estimate: ShippingEstimate };
const cache = new Map<string, CacheEntry>();
/** Client IP → timestamps of EasyPost lookups in the last hour. */
const lookupsByIp = new Map<string, number[]>();

// ---- Netlify entry point --------------------------------------------------

/** Netlify passes a context with the client's IP as the second argument. */
export default async function handler(req: Request, context?: { ip?: string }): Promise<Response> {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};
  return handleShippingEstimate(
    req,
    {
      apiKey: env.EASYPOST_KEY,
      fetch: globalThis.fetch.bind(globalThis),
      now: Date.now,
      log: (message) => console.error(`[shipping-estimate] ${message}`),
    },
    clientIp(req, context),
  );
}

export const config = { path: '/api/shipping-estimate' };

function clientIp(req: Request, context?: { ip?: string }): string | null {
  const ip =
    context?.ip ||
    req.headers.get('x-nf-client-connection-ip') ||
    req.headers.get('x-forwarded-for')?.split(',')[0];
  return ip?.trim() || null;
}

// ---- Handler (dependency-injected for tests) --------------------------------

export async function handleShippingEstimate(req: Request, deps: Deps, ip: string | null = null): Promise<Response> {
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

  const box = matchPresetId(input) ?? `custom:${pkg.dimsIn.join('x')}@${pkg.actualWeightLb}`;
  const cacheKey = `${input.zip.slice(0, 3)}|${input.residential ? 'res' : 'biz'}|${box}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > deps.now()) return json(cached.estimate);

  if (!deps.apiKey) {
    deps.log('EASYPOST_KEY is not set; returning zone-table estimate.');
    return json(roughShippingEstimate(input));
  }

  if (ip && !allowLookup(ip, deps.now())) {
    deps.log(`Rate limit reached for a client (${SHIPPING_ESTIMATE.rateLimitPerHour}/hour); returning zone-table estimate.`);
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
          // residential drives the carrier's residential delivery surcharge (~$6.50/package).
          to_address: { zip: input.zip, country: 'US', residential: input.residential },
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

// ---- rate limit ------------------------------------------------------------------

/** Sliding one-hour window per IP. Records the lookup when allowed. */
function allowLookup(ip: string, now: number): boolean {
  const recent = (lookupsByIp.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= SHIPPING_ESTIMATE.rateLimitPerHour) {
    lookupsByIp.set(ip, recent);
    return false;
  }
  recent.push(now);
  lookupsByIp.delete(ip); // re-insert so Map order tracks recency for eviction
  if (lookupsByIp.size >= MAX_TRACKED_IPS) {
    const oldest = lookupsByIp.keys().next().value;
    if (oldest !== undefined) lookupsByIp.delete(oldest);
  }
  lookupsByIp.set(ip, recent);
  return true;
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
  if (typeof b.residential !== 'boolean') return { error: 'residential must be true or false.' };

  return { request: { zip, ...nums, residential: b.residential } };
}

function remember(key: string, estimate: ShippingEstimate, now: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expiresAt: now + SHIPPING_ESTIMATE.cacheHours * HOUR_MS, estimate });
}

/** Test hook: clear the in-memory rate cache and rate-limit counters. */
export function clearRateCache() {
  cache.clear();
  lookupsByIp.clear();
}

function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
  });
}
