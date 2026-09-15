/**
 * Static zone table — the "roughly" shipping estimate.
 *
 * Shared by the server (netlify/functions/shipping-estimate.ts) and the
 * browser (shipping-estimate.ts). It's the fallback whenever live EasyPost
 * rates aren't available: no API key, carrier error, timeout, or the endpoint
 * itself is unreachable (e.g. local `astro dev`, which doesn't run functions).
 * Its zone guess is also the cache key's zone on the server.
 *
 * Ground rates approximated from the shop in Olathe, CO (81425) by 3-digit
 * ZIP prefix. Only meant to land in a believable range; the real rate is
 * confirmed on the phone.
 */

import { SHIPPING_ESTIMATE } from '../../config/mail-in-intake';
import { measurePackage } from './rules';
import type { ShippingEstimate, ShippingEstimateRequest } from './types';

const ZONE_BASE_USD: Record<number, number> = { 2: 12, 3: 14, 4: 16, 5: 18, 6: 20, 7: 22, 8: 25 };
const ZONE_PER_LB_USD: Record<number, number> = { 2: 0.55, 3: 0.75, 4: 0.95, 5: 1.15, 6: 1.35, 7: 1.55, 8: 1.75 };
const REMOTE_MULTIPLIER = 1.5;

/** Very rough ground zone from 81425 by 3-digit ZIP prefix. */
export function approximateZone(zip: string): { zone: number; remote: boolean } {
  const p = Number(zip.slice(0, 3));
  if (p >= 995 || p === 967 || p === 968 || (p >= 6 && p <= 9)) return { zone: 8, remote: true }; // AK, HI, PR
  if (p >= 810 && p <= 816) return { zone: 2, remote: false }; // western & southern Colorado
  if (p >= 800 && p <= 809) return { zone: 3, remote: false }; // Front Range
  if ((p >= 820 && p <= 831) || (p >= 840 && p <= 847) || (p >= 870 && p <= 884)) return { zone: 3, remote: false }; // WY, UT, NM
  if ((p >= 832 && p <= 838) || (p >= 850 && p <= 865) || (p >= 889 && p <= 898)) return { zone: 4, remote: false }; // ID, AZ, NV
  const byRegion: Record<number, number> = { 0: 8, 1: 8, 2: 8, 3: 7, 4: 7, 5: 5, 6: 5, 7: 5, 8: 4, 9: 6 };
  return { zone: byRegion[Math.floor(p / 100)] ?? 8, remote: false };
}

/** Round trip → range: low rounds down, high is padded and rounds up. */
export function toEstimateRange(roundTripUsd: number, source: ShippingEstimate['source']): ShippingEstimate {
  return {
    lowUsd: Math.floor(roundTripUsd),
    highUsd: Math.ceil(roundTripUsd * (1 + SHIPPING_ESTIMATE.highEndPadding)),
    source,
  };
}

/** Zone-table estimate for a request. Always succeeds; always labeled "roughly". */
export function roughShippingEstimate(req: ShippingEstimateRequest): ShippingEstimate {
  const { zone, remote } = approximateZone(req.zip);
  const pkg = measurePackage(req.length, req.width, req.height, req.weight);
  const oneWay = (ZONE_BASE_USD[zone] + ZONE_PER_LB_USD[zone] * pkg.billableWeightLb) * (remote ? REMOTE_MULTIPLIER : 1);
  return toEstimateRange(oneWay * 2, 'roughly');
}
