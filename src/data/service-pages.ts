/**
 * Dedicated SEO landing pages, one per price-list line item (minus pricing).
 * Powers /services/[slug] via src/pages/services/[slug].astro — same
 * data-file-plus-dynamic-route pattern as src/data/service-areas.ts.
 *
 * "Tipi & wall tent patches" is NOT here — that item already has a richer,
 * bespoke page (with real pricing) at src/pages/services/canvas-tent-repair.astro,
 * a static file living alongside this dynamic route. Do not add a
 * 'canvas-tent-repair' slug below or the build will collide with it.
 *
 * "Custom / one-off jobs" has no entry either — it's a catch-all, not a
 * distinct searchable service, and is already covered by the "Got Something
 * Weird?" callout on the main Services & Pricing page.
 */

import type { PortfolioItem } from '../lib/portfolio';

export interface WhatFixedItem {
  name: string;
  body: string;
}

export interface ServiceFaq {
  q: string;
  a: string;
}

export interface ServiceCrossLink {
  /** Bold lead-in phrase, e.g. "Building something new instead?" */
  lead: string;
  /** Rest of the sentence, plain text. */
  body: string;
  href: string;
  /** Full link text, e.g. "See Custom Sun Shades →" */
  cta: string;
}

export interface ServicePage {
  slug: string;
  /** Must match a PriceItem.name in config/services.ts so the price-list link stays honest. */
  priceItemName: string;
  eyebrow: string;
  h1: string;
  tagline: string;
  intro: string;
  metaTitle: string;
  metaDescription: string;
  heroCaption: string;
  whatGetsFixedHeading: string;
  whatGetsFixed: WhatFixedItem[];
  faqs: ServiceFaq[];
  /** Filter published portfolio items down to real photos relevant to this page. */
  portfolioFilter?: (item: PortfolioItem) => boolean;
  galleryEmptyCopy: string;
  crossLink?: ServiceCrossLink;
}

export const servicePages: ServicePage[] = [
  // ---------- Outdoor & Expedition Gear ----------
  {
    slug: 'drybag-repair',
    priceItemName: 'Drybag patches & roll-top repair',
    eyebrow: '§ Drybag & Dry Sack Repair',
    h1: 'Drybag Repair',
    tagline: 'A blown roll-top or a pinhole leak doesn’t mean the bag’s dead — most drybags patch clean and go right back on the river.',
    intro: 'Torn seams, punctured fabric, a roll-top that won’t seal anymore — if you searched drybag repair or dry sack repair near me, this is the shop. Raft guides and packrafters on the Gunnison and the Dolores send these through regularly. Send a photo, I’ll give you a real quote inside 24 hours.',
    metaTitle: 'Drybag & Dry Sack Repair | Western Slope Stitchworks',
    metaDescription: 'Drybag repair for torn seams, punctures, and blown roll-tops. Any brand, sewn or welded fabric. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Drybag',
    whatGetsFixedHeading: 'Real Drybag Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Seam & Weld Failure', body: 'Blown seams get restitched and sealed so the bag actually holds air and water again, not just patched over.' },
      { name: 'Roll-Top Closure Repair', body: 'Worn or torn roll-top edges get rebuilt so the seal actually seals.' },
      { name: 'Puncture & Abrasion Patches', body: 'Small tears and puncture holes patched clean — doesn’t need to be a whole-bag replacement.' },
      { name: 'Buckle & Strap Reattachment', body: 'Torn-off buckles and straps get re-anchored to fabric that can actually hold them.' },
    ],
    faqs: [
      { q: 'Can a drybag actually be repaired, or does it need to be replaced?', a: 'Most tears and blown seams patch clean. If the fabric itself is degraded — sun-rotted, brittle, falling apart at the touch — I’ll tell you it’s not worth fixing rather than take your money on something that won’t hold.' },
      { q: 'Will a patched drybag still be waterproof?', a: 'That’s the whole point of doing it right — sealed seams and patches that actually hold water out, not just fabric glued over a hole.' },
      { q: 'How long does drybag repair take?', a: 'Most drybag jobs are quick — inside the standard 3–7 day turnaround, often faster if it’s a single patch.' },
      { q: 'Do you work on dry sacks from any brand, or just specific ones?', a: 'Any brand — NRS, SealLine, whatever you’re running. If it’s welded or sewn fabric, I can usually work on it.' },
    ],
    portfolioFilter: (item) => item.category === 'pack_bag_repair' && item.title.toLowerCase().includes('patch bag'),
    galleryEmptyCopy: 'Photos from drybag repair jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'sleeping-bag-zipper-repair',
    priceItemName: 'Sleeping bag zipper replacement',
    eyebrow: '§ Sleeping Bag Zipper Repair',
    h1: 'Sleeping Bag Zipper Repair',
    tagline: 'A blown zipper is the most common reason a good sleeping bag ends up in the closet instead of a pack.',
    intro: 'Separating teeth, a broken slider, a zipper that catches every pull — sleeping bag zipper repair is one of the most common jobs that comes through the shop. If you searched zipper repair near me, send a photo of the damage and I’ll tell you what it needs.',
    metaTitle: 'Sleeping Bag Zipper Repair | Western Slope Stitchworks',
    metaDescription: 'Sleeping bag zipper replacement and slider repair — down or synthetic, any brand. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Zipper Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Separating or Blown Zipper Teeth', body: 'Full zipper replacement when the teeth themselves are shot — matched to the original size and pull direction.' },
      { name: 'Broken or Stuck Sliders', body: 'Slider-only replacement when the teeth are fine and it’s just the pull that’s failed — cheaper and faster when it applies.' },
      { name: 'Zipper Pull & Tab Repair', body: 'Snapped pulls and tabs replaced so you’re not fighting the zipper with pliers.' },
      { name: 'Draft Tube & Zipper Guard Repair', body: 'Torn draft tubes and zipper guards restitched so the zipper does its job without a cold gap.' },
    ],
    faqs: [
      { q: 'Is it cheaper to replace the zipper or the whole sleeping bag?', a: 'Almost always the zipper. A full bag costs a lot more than a zipper repair, and if the insulation and shell are still good there’s no reason to replace the whole thing.' },
      { q: 'Can you match the zipper to my exact bag?', a: 'I match gauge, length, and pull direction as closely as possible. Exact brand-for-brand hardware isn’t always available, but the repair holds and looks right.' },
      { q: 'Does this work on down bags, or just synthetic?', a: 'Both — the zipper repair itself doesn’t touch the insulation, so down bags are fine.' },
      { q: 'How fast can I get this done before a trip?', a: 'Standard turnaround is 3–7 days. If you’re up against a trip date, tell me when you text the photo and I’ll see what I can do.' },
    ],
    galleryEmptyCopy: 'Photos from sleeping bag zipper jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'tarp-bivy-shelter-repair',
    priceItemName: 'Tarp, bivy, and shelter repair',
    eyebrow: '§ Tarp, Bivy & Shelter Repair',
    h1: 'Tarp & Bivy Repair',
    tagline: 'Ultralight shelters take a beating for how little fabric they’re made of — most tears and seam failures are a clean fix, not a retirement.',
    intro: 'Torn tarps, blown-out bivy seams, ripstop punctures — if you searched tarp repair near me or bivy repair, this is the shop. Backcountry and river-trip shelters both come through the bench regularly. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Tarp & Bivy Repair — Shelter Repair | Western Slope Stitchworks',
    metaDescription: 'Tarp, bivy, and backcountry shelter repair — ripstop tears, seam failure, guyline and zipper repair. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Shelter Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Ripstop & Fabric Tears', body: 'Patched to match the weight and weave as closely as possible so the repair doesn’t turn into the next failure point.' },
      { name: 'Seam & Seam-Tape Failure', body: 'Reinforced stitching on blown seams, plus seam-tape guidance if that’s part of the issue.' },
      { name: 'Guyline & Tie-Out Reattachment', body: 'Torn-off tie-outs and guyline loops re-anchored to fabric that’ll actually hold tension.' },
      { name: 'Zipper & Door Repair', body: 'Bivy and shelter door zippers repaired or replaced the same as tent zippers.' },
    ],
    faqs: [
      { q: 'Can ultralight fabric actually be repaired, or is it too thin to sew?', a: 'Most ultralight shelter fabric sews and patches fine — it just takes a lighter touch and the right thread. If it’s too far gone I’ll tell you.' },
      { q: 'Do you work on bivy sacks specifically, or just tarps?', a: 'Both — bivy seams, zippers, and fabric tears are the same category of work as tarp repair.' },
      { q: 'What about a canvas tarp instead of an ultralight one?', a: 'Heavier canvas tarps are actually the easier end of the job — the same walking-foot machine that handles wall tents handles ranch and camp tarps.' },
      { q: 'How long does a tarp or shelter repair take?', a: '3–7 days on most jobs, same as everything else in the shop.' },
    ],
    galleryEmptyCopy: 'Photos from tarp and shelter repair jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },

  // ---------- Raft, Boat & Powersports ----------
  {
    slug: 'raft-frame-bag-repair',
    priceItemName: 'Raft frame bag repair & rebuilds',
    eyebrow: '§ Raft Frame Bag Repair',
    h1: 'Raft Frame Bag Repair',
    tagline: 'Frame bags take the brunt of every rock strike and gear-loading season — most rebuilds beat buying new.',
    intro: 'Blown seams, torn straps, a frame bag that doesn’t fit the rig anymore — raft frame bag repair and rebuilds are steady work here, especially heading into Gunnison and Dolores season. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Raft Frame Bag Repair & Rebuilds | Western Slope Stitchworks',
    metaDescription: 'Raft frame bag repair and rebuilds — blown seams, strap and buckle rebuilds, fit adjustments. Any brand. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Frame Bag',
    whatGetsFixedHeading: 'Real Frame Bag Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Seam & Panel Blowouts', body: 'Restitched or rebuilt panel-by-panel on the same heavy-duty machine used for every canvas job in the shop.' },
      { name: 'Strap & Buckle Rebuilds', body: 'Worn straps and torn-off buckle points rebuilt to actually hold load, not just patched over.' },
      { name: 'Frame Fit Adjustments', body: 'Bags resized or reshaped to fit a different frame when the rig’s changed.' },
      { name: 'Zipper & Closure Repair', body: 'Zippers replaced, roll-tops rebuilt, buckle closures repaired.' },
    ],
    faqs: [
      { q: 'Can a torn frame bag be rebuilt, or do I need a new one?', a: 'Most tears and blown seams rebuild clean. If the base fabric’s shot from years of rock strikes, I’ll tell you it’s not worth saving.' },
      { q: 'Do you work on frame bags for any raft brand?', a: 'Yes — NRS, Aire, custom-built rigs, whatever you’re running. If it’s sewn fabric and webbing, I can work on it.' },
      { q: 'Can you resize a frame bag to fit a new frame?', a: 'Usually, yes — bring the frame dimensions or the bag itself and I’ll tell you what’s involved.' },
      { q: 'How long does frame bag repair take?', a: '3–7 days on most jobs. Bigger rebuilds can run longer — I’ll give you a real date with the quote.' },
    ],
    portfolioFilter: (item) => item.category === 'pack_bag_repair' && item.title.toLowerCase().includes('raft'),
    galleryEmptyCopy: 'Photos from raft frame bag jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'strap-webbing-repair',
    priceItemName: 'Strap, webbing & cam-strap repair (3+ per order)',
    eyebrow: '§ Strap & Webbing Repair',
    h1: 'Strap & Webbing Repair',
    tagline: 'A snapped strap or a cam buckle that won’t bite anymore is one of the fastest, cheapest fixes in the shop.',
    intro: 'Torn webbing, ripped-out stitching, a cam strap that’s lost its grip — strap and webbing repair is quick work, and it’s usually cheaper than replacing the whole system. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Strap, Webbing & Cam Strap Repair | Western Slope Stitchworks',
    metaDescription: 'Strap, webbing, and cam-strap repair — torn webbing, buckle replacement, re-bar-tacking. Priced per strap for 3+. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Strap Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Torn or Frayed Webbing', body: 'Replaced section-by-section rather than swapping the whole strap system.' },
      { name: 'Cam Buckle Replacement', body: 'Worn cam buckles that won’t hold tension get swapped for hardware that actually bites.' },
      { name: 'Stitching & Bar-Tack Failure', body: 'Re-bar-tacked at load points so the repair holds under real tension, not just looks fixed.' },
      { name: 'Multi-Strap Orders', body: 'Bring in three or more straps at once and it’s priced per strap — efficient for outfitters and guide services replacing a whole set.' },
    ],
    faqs: [
      { q: 'Is it worth repairing a strap, or should I just buy a new one?', a: 'For most webbing and cam-strap repairs, yes — it’s faster and cheaper than sourcing new hardware and sewing a whole new strap yourself.' },
      { q: 'Do you match the webbing width and cam buckle type?', a: 'As close as I can get — width, weight, and buckle style matched to the original wherever that hardware is available.' },
      { q: 'Can I bring in a whole set of straps at once?', a: 'Yes — that’s actually the most efficient way to do it, and it’s priced per strap for three or more in one order.' },
      { q: 'How fast is strap repair?', a: 'Usually one of the quicker jobs in the shop — often inside the standard 3–7 day turnaround, sometimes faster.' },
    ],
    galleryEmptyCopy: 'Photos from strap and webbing repair jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'utv-seat-upholstery',
    priceItemName: 'UTV / side-by-side seat re-upholstery (higher if sewing is required)',
    eyebrow: '§ UTV & Side-by-Side Seat Upholstery',
    h1: 'UTV Seat Upholstery',
    tagline: 'Sun-cracked vinyl and blown-out foam are the two things that kill a UTV seat — both are fixable without replacing the whole seat.',
    intro: 'Cracked vinyl, torn seams, foam that’s compressed flat — UTV seat upholstery and side-by-side seat re-upholstery are steady work on the Western Slope, where trail season is hard on every seat in the fleet. Send a photo, real quote inside 24 hours.',
    metaTitle: 'UTV & Side-by-Side Seat Upholstery | Western Slope Stitchworks',
    metaDescription: 'UTV and side-by-side seat re-upholstery — cracked vinyl, torn seams, foam replacement, fleet jobs. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / UTV Seat',
    whatGetsFixedHeading: 'Real UTV Seat Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Cracked & Sun-Rotted Vinyl', body: 'Re-covered in fresh vinyl matched to the original color and grain as closely as possible.' },
      { name: 'Torn Seams & Panel Blowouts', body: 'Restitched or fully re-panelled depending on how far the tear runs.' },
      { name: 'Foam Replacement', body: 'Compressed or crumbling foam swapped out so the seat isn’t just a fresh cover over a dead cushion.' },
      { name: 'Multi-Seat & Fleet Jobs', body: 'Outfitters and rental fleets running multiple UTVs get the same treatment on every seat in one visit.' },
    ],
    faqs: [
      { q: 'Can you match my UTV’s original seat color?', a: 'As close as the available vinyl stock allows — bring a photo or the make and model and I’ll tell you what’s realistic.' },
      { q: 'Do you replace the foam, or just the cover?', a: 'Both, if needed. If the foam’s still solid I’ll just re-cover it — no reason to charge for foam you don’t need.' },
      { q: 'Can you do multiple seats from the same rig or fleet at once?', a: 'Yes — that’s common work for outfitters and rental operations, and it usually goes through together on one visit.' },
      { q: 'How long does UTV seat re-upholstery take?', a: '3–7 days on most jobs, longer if sewing and foam work are both involved — I’ll give you a real date with the quote.' },
    ],
    portfolioFilter: (item) => item.category === 'upholstery_seats' && item.title.toLowerCase().includes('atv'),
    galleryEmptyCopy: 'Photos from UTV seat jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'snowmobile-seat-recover',
    priceItemName: 'Snowmobile seat re-cover (higher if sewing is required)',
    eyebrow: '§ Snowmobile Seat Re-Cover',
    h1: 'Snowmobile Seat Re-Cover',
    tagline: 'Cold-weather vinyl cracks fast — a snowmobile seat re-cover is usually the difference between one more season and a cold ride.',
    intro: 'Split seams, cracked cold-weather vinyl, foam that’s packed flat from years of trail riding — snowmobile seat re-cover work picks up every fall ahead of the first snow. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Snowmobile Seat Re-Cover | Western Slope Stitchworks',
    metaDescription: 'Snowmobile seat re-cover — cracked vinyl, multi-panel pattern work, foam replacement. Cold-rated vinyl. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Snowmobile Seat',
    whatGetsFixedHeading: 'Real Snowmobile Seat Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Cracked & Split Vinyl', body: 'Re-covered in cold-rated vinyl built to handle winter temperatures without splitting again next season.' },
      { name: 'Multi-Panel Pattern Work', body: 'Two-up and multi-panel seats re-patterned and rebuilt to the original shape, not just a flat cover stretched over it.' },
      { name: 'Foam Replacement', body: 'Packed-down foam replaced so the seat has real cushion left, not just a fresh cover over a dead base.' },
      { name: 'Seam & Piping Rebuilds', body: 'Blown seams and worn piping restitched to hold up to real trail vibration.' },
    ],
    faqs: [
      { q: 'Does the vinyl you use actually hold up in the cold?', a: 'Yes — cold-rated vinyl is the point. Standard upholstery vinyl cracks fast in winter temps; this is built for it.' },
      { q: 'Can you rebuild a two-up or multi-panel snowmobile seat?', a: 'Yes — multi-panel pattern work is regular work here, matching the original panel lines rather than simplifying the shape.' },
      { q: 'Should I replace the foam too, or just the cover?', a: 'Depends on how packed down it is. If it’s still holding shape I’ll just re-cover it; if it’s flat, foam replacement is worth doing at the same time.' },
      { q: 'How far ahead of snowmobile season should I get this done?', a: 'Send it in as early as you can before the season starts — turnaround’s usually 3–7 days, but fall is a busier stretch.' },
    ],
    portfolioFilter: (item) => item.category === 'upholstery_seats' && item.title.toLowerCase().includes('snowmobile'),
    galleryEmptyCopy: 'Photos from snowmobile seat jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'boat-seat-cushion-bimini-repair',
    priceItemName: 'Boat seat, cushion & bimini repair',
    eyebrow: '§ Boat Seat, Cushion & Bimini Repair',
    h1: 'Boat Seat & Bimini Repair',
    tagline: 'Sun and water are hard on marine vinyl and bimini fabric both — most of what fails is fixable without a full replacement.',
    intro: 'Cracked boat seat vinyl, torn cushions, a bimini top that’s lost its zipper or its shape — boat seat, cushion, and bimini repair is regular work for the drift boats and rafts running the Gunnison and the Colorado. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Boat Seat & Bimini Repair | Western Slope Stitchworks',
    metaDescription: 'Boat seat, cushion, and bimini top repair — marine vinyl, zipper replacement, foam replacement. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Boat Bimini',
    whatGetsFixedHeading: 'Real Boat & Bimini Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Cracked & Torn Marine Vinyl', body: 'Boat seats and cushions re-covered in marine-grade vinyl built to handle sun and water.' },
      { name: 'Bimini Top Repair', body: 'Torn bimini fabric, blown seams, and frame-attachment points repaired or rebuilt.' },
      { name: 'Bimini & Boat Cover Zipper Replacement', body: 'Zippers on biminis, boat covers, and cushion covers replaced when they seize or separate.' },
      { name: 'Cushion Foam Replacement', body: 'Waterlogged or compressed foam swapped so the cushion isn’t just a fresh cover over a dead pad.' },
    ],
    faqs: [
      { q: 'Does the vinyl you use hold up to sun and water?', a: 'Yes — marine-grade vinyl is built for exactly that; it’s what keeps a re-covered seat from cracking again in one season.' },
      { q: 'Can a bimini top be repaired, or does it need to be replaced?', a: 'Most tears, blown seams, and zipper failures repair clean. If the fabric itself is sun-rotted through, I’ll tell you honestly.' },
      { q: 'Do you work on drift boats and rafts, or just powerboats?', a: 'All of it — drift boat seats, raft-mounted cushions, powerboat upholstery, bimini tops across the board.' },
      { q: 'How long does boat seat or bimini repair take?', a: '3–7 days on most jobs, same as everything else in the shop.' },
    ],
    portfolioFilter: (item) => item.title.toLowerCase().includes('boat'),
    galleryEmptyCopy: 'Photos from boat seat and bimini jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'dog-vest-k9-gear-repair',
    priceItemName: 'Dog vest & K9 gear',
    eyebrow: '§ Dog Vest & K9 Gear Repair',
    h1: 'Dog Vest & K9 Gear Repair',
    tagline: 'Working dog gear takes as much abuse as anything else on this bench — torn vests and blown harnesses get fixed, not replaced.',
    intro: 'Ripped panels, torn webbing, a harness buckle that’s given out — dog vest and K9 gear repair covers hunting dog vests, service and working dog harnesses, and pack gear built for dogs. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Dog Vest & K9 Gear Repair | Western Slope Stitchworks',
    metaDescription: 'Dog vest and K9 gear repair — hunting vests, harnesses, pack gear. Torn panels, webbing, buckles. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Dog Gear Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Torn Panels & Fabric Blowouts', body: 'Patched or panel-replaced depending on where the damage is and how the surrounding fabric’s holding up.' },
      { name: 'Webbing & Strap Repair', body: 'Torn harness webbing and strap systems rebuilt to actually hold load.' },
      { name: 'Buckle & Hardware Replacement', body: 'Broken buckles and D-rings replaced with hardware rated for the job.' },
      { name: 'Seam & Stitching Failure', body: 'Reinforced stitching at stress points so the repair outlasts the original seam.' },
    ],
    faqs: [
      { q: 'Do you work on hunting dog vests specifically?', a: 'Yes — hunting vests, blaze orange gear, neoprene and cordura builds, all common work here given the hunting culture on the Western Slope.' },
      { q: 'Can a torn harness be repaired safely, or should it be replaced?', a: 'Depends on where the tear is. If it’s a load-bearing point I’ll be straight with you about whether a repair actually holds up or if it’s safer to replace.' },
      { q: 'Do you work on service or working K9 gear too?', a: 'Yes — vests, harnesses, and pack gear for service and working dogs get the same treatment as hunting and recreation gear.' },
      { q: 'How long does dog gear repair take?', a: 'Usually quick — most of these jobs are inside the standard 3–7 day turnaround.' },
    ],
    galleryEmptyCopy: 'Photos from dog vest and K9 gear jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },

  // ---------- Commercial & Upholstery ----------
  {
    slug: 'gym-pad-reupholstery',
    priceItemName: 'Gym equipment pad re-upholstery',
    eyebrow: '§ Gym Equipment Pad Re-Upholstery',
    h1: 'Gym Equipment Pad Re-Upholstery',
    tagline: 'Cracked vinyl on a bench or a leg-press pad is a re-cover job, not a reason to replace the whole machine.',
    intro: 'Split seams, cracked commercial vinyl, foam that’s packed flat from years of use — gym equipment pad re-upholstery keeps machines in service without the cost of new equipment. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Gym Equipment Pad Re-Upholstery | Western Slope Stitchworks',
    metaDescription: 'Gym equipment pad re-upholstery — benches, machine pads, foam replacement, facility jobs. Commercial-grade vinyl. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Gym Equipment Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Cracked & Split Vinyl', body: 'Re-covered in commercial-grade vinyl built for daily gym use, not household upholstery fabric.' },
      { name: 'Bench, Rack & Machine Pad Covers', body: 'Benches, leg press pads, preacher curl pads, and full machine upholstery re-covered to the original shape.' },
      { name: 'Foam Replacement', body: 'Packed-down padding replaced so the fix isn’t just a new cover over dead foam.' },
      { name: 'Multi-Machine & Facility Jobs', body: 'Gyms and fitness studios sending in a full round of equipment get consistent turnaround across every piece.' },
    ],
    faqs: [
      { q: 'Do you work with commercial gyms and fitness studios directly?', a: 'Yes — facility accounts sending in multiple machines at once are regular work here, same shop and same machine as everything else.' },
      { q: 'Can you match our gym’s branding or color scheme?', a: 'Within what’s available in commercial vinyl stock, yes — bring a sample or tell me the color and I’ll tell you what’s realistic.' },
      { q: 'Is it cheaper to re-cover or replace the machine?', a: 'Almost always cheaper to re-cover, assuming the machine itself and its foam are still structurally sound.' },
      { q: 'How long does a facility job take?', a: 'Standard single-pad jobs run 3–7 days. Multi-machine facility orders take longer — ask for a real timeline when you quote it.' },
    ],
    galleryEmptyCopy: 'Photos from gym pad re-upholstery jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'restaurant-booth-barstool-recover',
    priceItemName: 'Restaurant booth & bar stool re-cover',
    eyebrow: '§ Restaurant Booth & Bar Stool Re-Cover',
    h1: 'Restaurant Booth & Bar Stool Re-Cover',
    tagline: 'Booth seats and bar stools take a beating every service — a re-cover keeps the dining room looking sharp without replacing the furniture.',
    intro: 'Cracked vinyl, torn seams, a booth cushion that’s lost its shape — restaurant booth and bar stool re-covering is commercial work that runs on a schedule restaurants can actually plan around. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Restaurant Booth & Bar Stool Re-Cover | Western Slope Stitchworks',
    metaDescription: 'Restaurant booth and bar stool re-covering — commercial vinyl, foam replacement, full dining room jobs. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Booth & Stool Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Cracked & Torn Vinyl', body: 'Booth seats, backs, and bar stool tops re-covered in commercial vinyl built for daily wear.' },
      { name: 'Foam & Cushion Replacement', body: 'Flattened or torn cushion foam replaced so the seat feels right again, not just looks fixed.' },
      { name: 'Piping & Seam Rebuilds', body: 'Worn piping and blown seams restitched to hold the original clean line.' },
      { name: 'Multi-Unit & Full Dining Room Jobs', body: 'Whole booth rows and full sets of bar stools done together, priced and scheduled around your service hours.' },
    ],
    faqs: [
      { q: 'Can you match our restaurant’s existing booth color or pattern?', a: 'Within what’s available in commercial vinyl stock — bring a sample from an existing booth and I’ll match it as close as possible.' },
      { q: 'Do you take on full dining room jobs, not just single pieces?', a: 'Yes — that’s the more common version of this work. Bring in a whole set of booths or stools and it’s scheduled and priced as one job.' },
      { q: 'Can you work around our restaurant’s operating hours?', a: 'Yes — pickup and drop-off can be scheduled around slow periods so the dining room isn’t down during service.' },
      { q: 'How long does a full booth or bar stool job take?', a: 'Single pieces run the standard 3–7 days. Full dining room jobs take longer — I’ll give you a real timeline when I quote it.' },
    ],
    galleryEmptyCopy: 'Photos from restaurant booth and bar stool jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'commercial-awning-repair',
    priceItemName: 'Awnings, patio covers, commercial canvas',
    eyebrow: '§ Awning & Commercial Canvas Repair',
    h1: 'Commercial Awning Repair',
    tagline: 'A torn storefront awning or a faded patio cover is a repair, not a reason to call a full replacement crew.',
    intro: 'Torn panels, faded and sun-rotted canvas, a patio cover that’s pulled loose from its frame — commercial awning repair and patio cover work keeps storefronts and outdoor dining spaces looking sharp without a full teardown. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Commercial Awning & Patio Cover Repair | Western Slope Stitchworks',
    metaDescription: 'Commercial awning and patio cover repair — torn panels, sun-rotted canvas, frame and hardware repair. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Awning',
    whatGetsFixedHeading: 'Real Awning Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Torn & Wind-Damaged Panels', body: 'Patched or panel-replaced depending on how far the damage runs and how the surrounding canvas is holding up.' },
      { name: 'Faded & Sun-Rotted Canvas', body: 'Assessed honestly — if the fabric’s too far gone to hold a stitch, I’ll tell you rather than sew something that won’t last.' },
      { name: 'Frame Attachment & Hardware Repair', body: 'Grommets, snaps, and frame-attachment points rebuilt so the awning actually stays put in wind.' },
      { name: 'Patio Cover & Storefront Canvas', body: 'Restaurant patios, storefront awnings, and commercial canvas structures across the Western Slope.' },
    ],
    faqs: [
      { q: 'Can a torn awning be patched, or does the whole panel need to be replaced?', a: 'Depends on where the tear is and how the surrounding canvas is holding up. Most tears patch clean; full-panel replacement only comes up when the fabric’s genuinely too far gone.' },
      { q: 'Do you work on storefront awnings, or just residential patio covers?', a: 'Both — commercial storefront work and residential patio covers get the same treatment.' },
      { q: 'Is this the same as your custom sun shade builds?', a: 'Related but different — this is repair work on an awning or cover you already have. If you’re starting from scratch, see the custom sun shade page instead.' },
      { q: 'How long does commercial awning repair take?', a: '3–7 days on most repairs. Bigger commercial jobs can run longer — I’ll give you a real date with the quote.' },
    ],
    portfolioFilter: (item) => item.category === 'awning',
    galleryEmptyCopy: 'Photos from awning and commercial canvas jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
    crossLink: {
      lead: 'Building something new instead?',
      body: 'This page covers repairing an awning, patio cover, or canvas structure you already have.',
      href: '/custom-builds/sun-shades/',
      cta: 'See Custom Sun Shades →',
    },
  },
  {
    slug: 'firehouse-turnout-gear-repair',
    priceItemName: 'Firehouse gear & turnout bag repair',
    eyebrow: '§ Firehouse Gear & Turnout Bag Repair',
    h1: 'Firehouse Gear & Turnout Bag Repair',
    tagline: 'Turnout bags and firehouse gear take serious abuse — most of what fails is a repair, not a replacement-budget problem.',
    intro: 'Torn turnout gear bags, blown seams, worn straps and buckles — firehouse gear repair is commercial account work, built around department schedules rather than one-off drop-ins. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Firehouse Gear & Turnout Bag Repair | Western Slope Stitchworks',
    metaDescription: 'Firehouse gear and turnout bag repair for fire departments — bag blowouts, strap and buckle rebuilds, fleet orders. Send a photo, get a real quote in 24 hours.',
    heroCaption: 'Plate 01 / Workshop',
    whatGetsFixedHeading: 'Real Firehouse Gear Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Turnout Bag Tears & Blowouts', body: 'Patched or rebuilt panel-by-panel on the same heavy-duty machine used for every canvas and webbing job in the shop.' },
      { name: 'Strap & Buckle Rebuilds', body: 'Worn straps and hardware replaced so gear bags hold up to daily station use.' },
      { name: 'Seam & Stitching Failure', body: 'Reinforced at stress points so the repair outlasts the original stitching.' },
      { name: 'Department Fleet & Multi-Bag Orders', body: 'Whole-station orders handled on a schedule that works around shift rotations.' },
    ],
    faqs: [
      { q: 'Do you work directly with fire departments, or only individual gear?', a: 'Both — individual turnout bags and full-department fleet orders are handled the same way, just scheduled around your rotation.' },
      { q: 'Can you match department-issued gear specs?', a: 'I’ll work with whatever hardware and webbing specs your department requires — bring the details or the damaged piece and I’ll tell you what’s realistic.' },
      { q: 'Is there a minimum order for department accounts?', a: 'No minimum beyond the standard $25 shop minimum per job — single bags and full fleets both get handled.' },
      { q: 'How does turnaround work for a department account?', a: 'Standard jobs run 3–7 days. For recurring department work, ask about a repair block so gear moves through on a predictable schedule.' },
    ],
    galleryEmptyCopy: 'Photos from firehouse gear jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
  {
    slug: 'church-banner-fabric-repair',
    priceItemName: 'Church kneelers, banners, fabric repair',
    eyebrow: '§ Church Kneelers, Banners & Fabric Repair',
    h1: 'Church Kneeler & Banner Repair',
    tagline: 'Kneeler pads, processional banners, altar and pew fabric — the kind of quiet, careful stitching work that keeps a sanctuary looking cared for.',
    intro: 'Worn kneeler cushions, torn banner fabric, faded pew upholstery — church kneeler and banner repair is careful commercial work, usually scheduled around service times so nothing’s out of place on a Sunday. Send a photo, real quote inside 24 hours.',
    metaTitle: 'Church Kneeler & Banner Repair | Western Slope Stitchworks',
    metaDescription: 'Church kneeler, banner, and pew fabric repair — cushion re-upholstery, banner and cable pocket fixes. Send a photo, get a real quote in 24 hours. Montrose, CO.',
    heroCaption: 'Plate 01 / Banner Repair',
    whatGetsFixedHeading: 'Real Sanctuary Fabric Damage, Fixed for Real.',
    whatGetsFixed: [
      { name: 'Kneeler Pad Re-Upholstery', body: 'Worn or torn kneeler cushions re-covered and re-padded to match the rest of the pew line.' },
      { name: 'Banner & Processional Fabric Repair', body: 'Torn banners, loose cable pockets, and faded panel seams restitched to hold their shape.' },
      { name: 'Pew & Altar Cloth Fabric Work', body: 'Fabric repair on pew cushions, altar cloths, and other sanctuary textiles.' },
      { name: 'Scheduled Around Services', body: 'Work timed around your service schedule so nothing’s mid-repair on a Sunday.' },
    ],
    faqs: [
      { q: 'Can you match our existing kneeler or pew fabric?', a: 'Within what’s available in commercial fabric stock — bring a sample and I’ll match it as close as possible.' },
      { q: 'Do you do a whole pew line at once, or just individual kneelers?', a: 'Either — full pew-line jobs are common, and they’re scheduled around your service calendar so there’s no disruption.' },
      { q: 'What about banner repair specifically — cable pockets, grommets, that kind of thing?', a: 'Yes — cable pocket fixes, grommet repair, and torn banner fabric are regular work, the same category as commercial and restaurant banner jobs.' },
      { q: 'How is turnaround scheduled around services?', a: 'Tell me your service days when you send the photo, and I’ll build the timeline around them rather than handing it back mid-week when it’s not useful yet.' },
    ],
    portfolioFilter: (item) => item.title.toLowerCase().includes('banner'),
    galleryEmptyCopy: 'Photos from banner and sanctuary fabric jobs are getting added to the portfolio. Text a photo of your own project and it might be the next one up.',
  },
];

export const findServicePage = (slug: string): ServicePage | undefined =>
  servicePages.find((p) => p.slug === slug);

/**
 * Maps each entry in `universalServices` (data/service-areas.ts) to its
 * dedicated service page. The 13 city pages render that list as plain text;
 * linking it builds the service × city internal mesh — every service page
 * picks up 13 contextually relevant inbound links instead of the single one
 * it gets from the price list.
 *
 * Entries with no dedicated page are intentionally absent and render unlinked.
 */
export const universalServiceLinks: Record<string, string> = {
  'Tipi & Wall Tent Repair': '/services/canvas-tent-repair/',
  'Raft Frame Bag Rebuilds': '/services/raft-frame-bag-repair/',
  'Drybag & Dry Sack Patches': '/services/drybag-repair/',
  'UTV & Snowmobile Seat Re-upholstery': '/services/utv-seat-upholstery/',
  'Boat Cushions & Biminis': '/services/boat-seat-cushion-bimini-repair/',
  'RV Awning Modifications': '/custom-builds/',
  'Gym Pad Re-upholstery': '/services/gym-pad-reupholstery/',
  'Firehouse & Wildland Gear': '/services/firehouse-turnout-gear-repair/',
  'Commercial Canvas': '/services/commercial-awning-repair/',
};

/** Shared 4-step process — identical voice/claims across every dynamic service page. */
export const sharedHowItWorks = [
  { title: 'Send a Photo', body: 'Text a photo of the damage — I can usually tell what’s involved from that alone.' },
  { title: 'Real Quote in 24 Hours', body: 'I’ll come back with an honest number and a turnaround date. No estimate fee.' },
  { title: 'Drop Off, Ship, or Schedule Pickup', body: 'Bring it to Montrose, box it up and ship it, or arrange pickup — free in Montrose, Olathe & Delta, small route fee elsewhere on the Western Slope.' },
  { title: 'Get It Back', body: 'Most jobs turn around in 3–7 days. I’ll tell you the real date when I quote it.' },
];
