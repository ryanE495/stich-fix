/**
 * Services & pricing data.
 * Edit items here and the /services page regenerates.
 * Price ranges use en dashes (–) intentionally — do not replace with hyphens.
 */

export interface PriceItem {
  name: string;
  price: string;
}

export interface ServiceCategory {
  id: string;
  num: string;
  title: string;
  items: PriceItem[];
}

export const categories: ServiceCategory[] = [
  {
    id: 'outdoor',
    num: '§ 01',
    title: 'Outdoor & Expedition Gear',
    items: [
      { name: 'Tipi & wall tent patches', price: '$60 – $150' },
      { name: 'Backpack repair (seams, panels, compression straps)', price: '$45 – $120' },
      { name: 'Hipbelt & shoulder strap rebuilds', price: '$60 – $120' },
      { name: 'Drybag patches & roll-top repair', price: '$25 – $50' },
      { name: 'Sleeping bag zipper replacement', price: '$55 – $90' },
      { name: 'Tarp, bivy, and shelter repair', price: '$30 – $80' },
    ],
  },
  {
    id: 'raft',
    num: '§ 02',
    title: 'Raft, Boat & Powersports',
    items: [
      { name: 'Raft frame bag repair & rebuilds', price: '$40 – $100' },
      { name: 'Strap, webbing & cam-strap repair (3+ per order)', price: '$15 per strap' },
      { name: 'UTV / side-by-side seat re-upholstery', price: '$150 per seat' },
      { name: 'Snowmobile seat re-cover', price: '$150 – $200' },
      { name: 'Boat seat, cushion & bimini repair', price: '$60 – $180' },
      { name: 'Dog vest & K9 gear', price: '$30 – $75' },
    ],
  },
  {
    id: 'commercial',
    num: '§ 03',
    title: 'Commercial & Upholstery',
    items: [
      { name: 'Gym equipment pad re-upholstery', price: '$75 – $180' },
      { name: 'Restaurant booth & bar stool re-cover', price: 'Quote by item' },
      { name: 'Awnings, patio covers, commercial canvas', price: 'Quote by job' },
      { name: 'Firehouse gear & turnout bag repair', price: 'Quote by job' },
      { name: 'Church kneelers, banners, fabric repair', price: 'Quote by job' },
      { name: 'Custom / one-off jobs', price: 'Ask' },
    ],
  },
];

export const dontDo = [
  'Clothing alterations',
  'Heavy leather (saddles, thick tack)',
  'Dry cleaning or restoration',
];
