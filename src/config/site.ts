/**
 * Site-wide configuration.
 * Update these values once and they propagate everywhere (nav, footer, CTAs, meta).
 */

export const site = {
  name: 'Western Slope Stitchworks',
  tagline: 'Est. Montrose, CO',
  description:
    "Heavy-duty gear and canvas repair on Colorado's Western Slope. Tipis, packs, rafts, tents, UTV seats, commercial canvas. Montrose, Grand Junction, Telluride. Free estimates.",
  url: 'https://westernslopestitchworks.com',

  phoneDisplay: '(970) 275-7962',
  phoneHref: 'tel:+19702757962',

  location: 'Montrose, CO',
  hours: 'Mon–Sat · 8am–6pm',
  serviceArea: [
    'Delta',
    'Montrose',
    'Grand Junction',
    'Ridgway',
    'Ouray',
    'Telluride',
  ],
} as const;

export const nav = [
  { href: '/', label: 'Home', key: 'home' },
  { href: '/services', label: 'Services & Pricing', key: 'services' },
  { href: '/custom-builds', label: 'Custom Builds', key: 'custom-builds' },
  { href: '/portfolio', label: 'Portfolio', key: 'portfolio' },
  { href: '/contact', label: 'Contact', key: 'contact' },
] as const;

// Keys that can appear as `active` on a page — includes the dropdown parent
// 'service-areas' even though it's not in the flat nav array above.
export type NavKey = (typeof nav)[number]['key'] | 'service-areas';

/**
 * SEO constants — OG image, logo image, schema @id anchors.
 * TODO: generate and upload /og-image.jpg (1200x630) and /logo.png to the site root before launch.
 */
export const seo = {
  ogImage: `${site.url}/og-image.jpg`,
  logoImage: `${site.url}/logo.png`,
  businessId: `${site.url}/#business`,
  telephoneE164: '+1-970-275-7962',
  postalCode: '81401',
  geo: { latitude: 38.4783, longitude: -107.8762 },
} as const;
