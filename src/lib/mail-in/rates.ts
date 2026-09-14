import { CARRIER_DEFAULT_COVERAGE_USD } from '../../config/mail-in-intake';
import type { RateLeg, RateQuote, RateRequest } from './types';

/**
 * ===========================================================================
 * PLACEHOLDER SHIPPING RATES — NOT REAL CARRIER PRICING
 * ===========================================================================
 *
 * TODO(backend): Replace the body of this function with a call to a
 * server-side endpoint that gets live rates from EasyPost or Shippo for both
 * legs (customer → shop, shop → customer), including declared-value coverage
 * and the residential delivery surcharge. Keep this signature and the
 * RateQuote shape and nothing else in the form has to change. Carrier API
 * keys must stay on the server — never call EasyPost/Shippo from the browser.
 *
 * Until then this approximates a ground rate from a rough zone guessed off
 * the ZIP prefix, measured from the shop in Olathe, CO (81425). It is only
 * meant to land in a believable range.
 */
export async function getShippingRates(req: RateRequest): Promise<RateQuote> {
  const { zone, remote } = approximateZone(req.destinationZip);

  const base = ZONE_BASE_USD[zone];
  const perLb = ZONE_PER_LB_USD[zone];
  const remoteMultiplier = remote ? 1.5 : 1;
  const legBase = Math.ceil((base + perLb * req.billableWeightLb) * remoteMultiplier);
  const insurance = declaredValueChargeUsd(req.declaredValueUsd);

  const toShop: RateLeg = {
    amountUsd: legBase + insurance,
    insuranceUsd: insurance,
    description: 'Your ZIP to the shop',
  };
  // Residential surcharge applies to the delivery end only — the return leg.
  const residentialFee = req.residential ? RESIDENTIAL_SURCHARGE_USD : 0;
  const toCustomer: RateLeg = {
    amountUsd: legBase + insurance + residentialFee,
    insuranceUsd: insurance,
    description: 'The shop back to you',
  };

  return {
    toShop,
    toCustomer,
    roundTripUsd: toShop.amountUsd + toCustomer.amountUsd,
    note: remote
      ? 'Estimated from your ZIP. Alaska, Hawaii, and Puerto Rico cost more to ship, and the exact carrier rate is confirmed before your label is created.'
      : 'Estimated from your ZIP. The exact carrier rate is confirmed before your label is created.',
  };
}

// ---- placeholder internals (delete with the function body above) ----------

const ZONE_BASE_USD: Record<number, number> = { 2: 12, 3: 14, 4: 16, 5: 18, 6: 20, 7: 22, 8: 25 };
const ZONE_PER_LB_USD: Record<number, number> = { 2: 0.55, 3: 0.75, 4: 0.95, 5: 1.15, 6: 1.35, 7: 1.55, 8: 1.75 };
const RESIDENTIAL_SURCHARGE_USD = 5;
const DECLARED_VALUE_RATE_PER_100_USD = 1.4;

/** Very rough ground zone from 81425 by 3-digit ZIP prefix. */
function approximateZone(zip: string): { zone: number; remote: boolean } {
  const p = Number(zip.slice(0, 3));
  if (p >= 995 || p === 967 || p === 968 || (p >= 6 && p <= 9)) return { zone: 8, remote: true }; // AK, HI, PR
  if (p >= 810 && p <= 816) return { zone: 2, remote: false }; // western & southern Colorado
  if (p >= 800 && p <= 809) return { zone: 3, remote: false }; // Front Range
  if ((p >= 820 && p <= 831) || (p >= 840 && p <= 847) || (p >= 870 && p <= 884)) return { zone: 3, remote: false }; // WY, UT, NM
  if ((p >= 832 && p <= 838) || (p >= 850 && p <= 865) || (p >= 889 && p <= 898)) return { zone: 4, remote: false }; // ID, AZ, NV
  const firstDigit = Math.floor(p / 100);
  const byRegion: Record<number, number> = { 0: 8, 1: 8, 2: 8, 3: 7, 4: 7, 5: 5, 6: 5, 7: 5, 8: 4, 9: 6 };
  return { zone: byRegion[firstDigit] ?? 8, remote: false };
}

/** Coverage above the carrier default, per leg. */
function declaredValueChargeUsd(declaredValueUsd: number): number {
  if (declaredValueUsd <= CARRIER_DEFAULT_COVERAGE_USD) return 0;
  const hundreds = Math.ceil((declaredValueUsd - CARRIER_DEFAULT_COVERAGE_USD) / 100);
  return Math.round(hundreds * DECLARED_VALUE_RATE_PER_100_USD * 100) / 100;
}
