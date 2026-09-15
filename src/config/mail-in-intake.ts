import type { BoxPreset, CategoryId, Option, PhotoSlotId, PriceBand, UnrepairableChoice } from '../lib/mail-in/types';
import { mailIn } from './mail-in';

/**
 * ===========================================================================
 * PRICE BANDS — edit repair estimate numbers here, nowhere else.
 * ===========================================================================
 * Placeholder numbers. Rewrite before launch.
 *
 * Each entry is one checkbox on step 3 ("What's wrong with it"). low/high are
 * whole US dollars. The running estimate sums the checked items and floors
 * the result at the mail-in minimum. Seat estimates are multiplied by the
 * number of seats. An empty array means "quoted case by case" (no checklist).
 *
 * ids are stored in the submitted payload — change labels and numbers freely,
 * but avoid renaming an id once the backend is live.
 */
export const PRICE_BANDS: Record<CategoryId, PriceBand[]> = {
  tent: [
    { id: 'door-zipper', label: 'Door zipper', low: 150, high: 250 },
    { id: 'window-zipper', label: 'Window zipper', low: 100, high: 175 },
    { id: 'tear-patch', label: 'Tear or hole patch', low: 75, high: 150 },
    { id: 'seam-resew', label: 'Seam re-sew', low: 125, high: 300 },
    { id: 'stove-jack', label: 'Stove jack', low: 100, high: 175, hint: 'The heat-proof opening the stovepipe runs through.' },
    { id: 'sod-cloth', label: 'Sod cloth', low: 200, high: 400, hint: 'The strip along the bottom edge that lies on the ground.' },
    { id: 'ridge-reinforcement', label: 'Ridge reinforcement', low: 125, high: 250, hint: 'The peak seam that carries the ridge pole.' },
  ],
  shade: [
    { id: 'tear-patch', label: 'Tear patch', low: 75, high: 150 },
    { id: 'seam-resew', label: 'Seam re-sew', low: 100, high: 250 },
    { id: 'hem-edge-rebuild', label: 'Hem or edge rebuild', low: 125, high: 275 },
    { id: 'grommet-hardware', label: 'Grommets or hardware points', low: 50, high: 150 },
    { id: 'zipper', label: 'Zipper', low: 100, high: 200 },
    { id: 'full-fabric-replacement', label: 'Full fabric replacement', low: 400, high: 900 },
  ],
  seat: [
    { id: 'seam-split', label: 'Seam split', low: 75, high: 150 },
    { id: 'vinyl-tear', label: 'Vinyl tear', low: 75, high: 175 },
    { id: 'foam-replacement', label: 'Foam replacement', low: 125, high: 300 },
    { id: 'base-pan-repair', label: 'Base or pan repair', low: 100, high: 250 },
    { id: 'full-recover', label: 'Full recover', low: 200, high: 500 },
  ],
  other: [],
};

/** Minimum charge on any mail-in job. Single source: config/mail-in.ts. */
export const MINIMUM_USD = mailIn.minimum;

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export const STEP_TITLES = [
  'What are you sending?',
  'Tell me about it',
  'What’s wrong with it',
  'Photos',
  'Terms',
  'Shipping and intake week',
  'Review and submit',
] as const;

export const STEP_COUNT = STEP_TITLES.length;

// ---------------------------------------------------------------------------
// Step 1 — categories
// ---------------------------------------------------------------------------

export const CATEGORIES: Option<CategoryId>[] = [
  { id: 'tent', label: 'Tent or tipi', hint: 'Wall tents, tipis, bell tents, canopy tops.' },
  { id: 'shade', label: 'Sun shade or awning', hint: 'RV awning fabric, shade sails, patio canopies, biminis.' },
  { id: 'seat', label: 'Seat or upholstery', hint: 'ATV, UTV, boat, and snowmobile seats.' },
  { id: 'other', label: 'Other canvas', hint: 'Tarps, covers, bags, banners, and anything else canvas.' },
];

// ---------------------------------------------------------------------------
// Step 2 — item details
// ---------------------------------------------------------------------------

export const TENT_TYPES: Option[] = [
  { id: 'wall', label: 'Wall tent' },
  { id: 'tipi', label: 'Tipi' },
  { id: 'bell', label: 'Bell tent' },
  { id: 'canopy-top', label: 'Canopy top' },
  { id: 'not-sure', label: 'Not sure' },
];

export const TENT_AGES: Option[] = [
  { id: 'under-2', label: 'Under 2 years' },
  { id: '2-5', label: '2 to 5 years' },
  { id: '5-10', label: '5 to 10 years' },
  { id: '10-plus', label: '10 years or more' },
  { id: 'not-sure', label: 'Not sure' },
];

export const SHADE_TYPES: Option[] = [
  { id: 'rv-awning-fabric', label: 'RV awning fabric' },
  { id: 'shade-sail', label: 'Shade sail' },
  { id: 'patio-canopy', label: 'Patio canopy' },
  { id: 'bimini-boat-cover', label: 'Bimini or boat cover' },
  { id: 'other', label: 'Other' },
];

export const SEAT_TYPES: Option[] = [
  { id: 'atv-utv', label: 'ATV or UTV' },
  { id: 'boat', label: 'Boat' },
  { id: 'snowmobile', label: 'Snowmobile' },
  { id: 'other', label: 'Other' },
];

export const SEAT_SENDING: Option[] = [
  {
    id: 'cover-only',
    label: 'Cover only',
    hint: 'Strip the cover off and fold it. Smallest box and the cheapest shipping.',
  },
  {
    id: 'cover-and-foam',
    label: 'Cover and foam',
    hint: 'A bigger box. Foam is light, but carriers charge for the space a box takes up, so this costs more to ship than the cover alone.',
  },
  {
    id: 'whole-seat',
    label: 'Whole seat with pan',
    hint: 'The pan can’t be squeezed down, so this is the biggest box and the most expensive shipping, often several times the cover alone. Send it this way if the pan needs work.',
  },
];

export const MAX_SEAT_QUANTITY = 10;

// ---------------------------------------------------------------------------
// Step 4 — photos
// ---------------------------------------------------------------------------

export const PHOTO_SLOTS: (Option<PhotoSlotId> & { hint: string })[] = [
  { id: 'overall', label: 'The whole item, laid out', hint: 'Spread it flat or set it up so the whole thing is in the frame.' },
  { id: 'damage', label: 'Close-up of the damage', hint: 'Put a tape measure or a quarter next to the damage so I can see the scale.' },
  { id: 'tag', label: 'Manufacturer’s tag', hint: 'The sewn-in label with the brand or model. If there isn’t one, photograph where it would be.' },
];

// ---------------------------------------------------------------------------
// Step 5 — terms
// ---------------------------------------------------------------------------

export const UNREPAIRABLE_CHOICES: Option<UnrepairableChoice>[] = [
  { id: 'return', label: 'Ship it back as-is', hint: 'You pay return shipping.' },
  { id: 'dispose', label: 'Dispose of it', hint: 'No return shipping.' },
];

/** Carrier coverage included on a label before declared value is added. */
export const CARRIER_DEFAULT_COVERAGE_USD = 100;

/** Card on file (display only for now). */
export const UNCLAIMED_RELEASE_DAYS = 60;

// ---------------------------------------------------------------------------
// Step 6 — shipping
// ---------------------------------------------------------------------------

/** Shop ZIP (Olathe, CO). Origin for return shipping, destination for inbound. */
export const ORIGIN_ZIP = '81425';

/**
 * Parcel carrier rules (UPS / FedEx ground).
 * - Dimensional weight = L × W × H / 139. Billable weight is the higher of
 *   actual and dimensional, rounded up to the next pound.
 * - Length + girth over 130 in, or volume over 17,280 cu in, is billed as a
 *   large package: 90 lb minimum plus an oversize fee. The form blocks it.
 * - Over 150 lb isn't a parcel at all.
 */
export const CARRIER_LIMITS = {
  dimDivisor: 139,
  maxLengthPlusGirthIn: 130,
  maxVolumeCubicIn: 17_280,
  oversizeMinimumBillableLb: 90,
  maxParcelWeightLb: 150,
} as const;

export const CUSTOM_BOX_ID = 'custom';

/** Box presets per category. Must stay under CARRIER_LIMITS. */
export const BOX_PRESETS: Record<CategoryId, BoxPreset[]> = {
  tent: [
    { id: 'tent-small', label: 'Small tent or tipi liner', hint: '24 × 18 × 12 in, about 25 lb', lengthIn: 24, widthIn: 18, heightIn: 12, weightLb: 25 },
    { id: 'tent-mid', label: 'Wall tent up to about 12 × 14', hint: '30 × 20 × 16 in, about 55 lb', lengthIn: 30, widthIn: 20, heightIn: 16, weightLb: 55 },
    { id: 'tent-large', label: 'Wall tent 14 × 16 and up', hint: '34 × 24 × 20 in, about 85 lb', lengthIn: 34, widthIn: 24, heightIn: 20, weightLb: 85 },
  ],
  shade: [
    { id: 'shade-small', label: 'Folded shade sail or canopy', hint: '18 × 14 × 8 in, about 10 lb', lengthIn: 18, widthIn: 14, heightIn: 8, weightLb: 10 },
    { id: 'shade-rv', label: 'RV awning fabric, folded', hint: '24 × 18 × 10 in, about 15 lb', lengthIn: 24, widthIn: 18, heightIn: 10, weightLb: 15 },
    { id: 'shade-boat', label: 'Bimini or boat cover', hint: '24 × 18 × 12 in, about 15 lb', lengthIn: 24, widthIn: 18, heightIn: 12, weightLb: 15 },
  ],
  seat: [
    { id: 'seat-cover', label: 'Cover only', hint: '16 × 12 × 6 in, about 4 lb', lengthIn: 16, widthIn: 12, heightIn: 6, weightLb: 4 },
    { id: 'seat-cover-foam', label: 'Cover and foam', hint: '24 × 20 × 12 in, about 10 lb', lengthIn: 24, widthIn: 20, heightIn: 12, weightLb: 10 },
    { id: 'seat-whole', label: 'Whole seat with pan', hint: '30 × 22 × 16 in, about 25 lb', lengthIn: 30, widthIn: 22, heightIn: 16, weightLb: 25 },
  ],
  other: [
    { id: 'other-small', label: 'Small box', hint: '16 × 12 × 8 in, about 8 lb', lengthIn: 16, widthIn: 12, heightIn: 8, weightLb: 8 },
    { id: 'other-medium', label: 'Medium box', hint: '24 × 18 × 12 in, about 20 lb', lengthIn: 24, widthIn: 18, heightIn: 12, weightLb: 20 },
    { id: 'other-large', label: 'Large box', hint: '30 × 24 × 18 in, about 40 lb', lengthIn: 30, widthIn: 24, heightIn: 18, weightLb: 40 },
  ],
};

/** Seat "what you're sending" choice → matching box preset, preselected on step 6. */
export const SEAT_SENDING_PRESET: Record<string, string> = {
  'cover-only': 'seat-cover',
  'cover-and-foam': 'seat-cover-foam',
  'whole-seat': 'seat-whole',
};

// ---------------------------------------------------------------------------
// Intake weeks
// ---------------------------------------------------------------------------

export const INTAKE_CAPACITY_PER_WEEK = 5;
export const INTAKE_WEEKS_SHOWN = 5;

// ---------------------------------------------------------------------------
// Shared lookups
// ---------------------------------------------------------------------------

export function optionLabel(options: Option[], id: string): string {
  return options.find((o) => o.id === id)?.label ?? id;
}
