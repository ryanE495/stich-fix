import { SHIPPING_ESTIMATE } from '../../config/mail-in-intake';
import { roughShippingEstimate } from './shipping-zones';
import type { ShippingEstimate, ShippingEstimateRequest } from './types';

/**
 * Browser side of the shipping estimate. Asks /api/shipping-estimate (the
 * Netlify Function that talks to EasyPost) and never throws: if the endpoint
 * is unreachable, slow, or returns something unexpected, it falls back to the
 * static zone table labeled "roughly". A shipping problem must never block
 * the form.
 *
 * Under plain `astro dev` the function isn't running, so this always returns
 * the "roughly" estimate locally. Use `netlify dev` to exercise live rates.
 */
export async function getShippingEstimate(req: ShippingEstimateRequest): Promise<ShippingEstimate> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SHIPPING_ESTIMATE.clientTimeoutMs);
  try {
    const res = await fetch(SHIPPING_ESTIMATE.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: unknown = await res.json();
    if (!isShippingEstimate(data)) throw new Error('Unexpected response shape');
    return { lowUsd: data.lowUsd, highUsd: data.highUsd, source: data.source };
  } catch {
    return roughShippingEstimate(req);
  } finally {
    clearTimeout(timer);
  }
}

function isShippingEstimate(value: unknown): value is ShippingEstimate {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.lowUsd === 'number' && Number.isFinite(v.lowUsd) && v.lowUsd >= 0 &&
    typeof v.highUsd === 'number' && Number.isFinite(v.highUsd) && v.highUsd >= v.lowUsd &&
    (v.source === 'live' || v.source === 'roughly')
  );
}
