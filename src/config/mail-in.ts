/**
 * Mail-in repair — the nationwide ship-in service.
 *
 * This is a separate business line from local drop-off/pickup (Montrose,
 * Olathe, Delta and the Western Slope). It targets national "mail in tent
 * repair" intent; the local service pages target "near me" intent. Keep the
 * two distinct — don't reuse local pricing ($25 minimum) or local wording here.
 *
 * Shared by /mail-in-repair and the intake form at /mail-in-repair/start so
 * the CTA wording, minimum, and shipping ranges can't drift between them.
 * Price ranges use en dashes (–), same as config/services.ts.
 */

export const mailIn = {
  path: '/mail-in-repair/',
  /** The request form. A request, not a checkout: every customer gets a call before anything ships. */
  startHref: '/mail-in-repair/start/',
  /** Every primary CTA uses exactly this wording. */
  ctaLabel: 'Start my repair request',
  minimum: 100,
  /** Ship-to location. Trust signal for out-of-state customers, not a local SEO signal. */
  shopLocation: 'Olathe, Colorado, just north of Montrose',
  // TODO(Ryan): if you want the weekly job cap shown on the page, add it here
  // and reference it in the "Booked by intake week" section.
} as const;

/**
 * Rough round-trip shipping ranges for the overview page. The request form
 * estimates shipping for the customer's ZIP (/api/shipping-estimate), and the
 * real rate is confirmed on the call.
 */
export const mailInShipping = [
  { name: 'Wall tents, round trip', price: '$150 – $300' },
  { name: 'Sun shades and seats, round trip', price: '$40 – $80' },
] as const;
