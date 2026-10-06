/**
 * Service area data — drives the dynamic /service-areas/[slug] pages,
 * the nav dropdown, the footer list, and the homepage internal-linking strip.
 *
 * Hero images are reused from the existing Supabase image set; do not add
 * new images here without coordinating with the rest of the site.
 */

export const HERO = {
  sewing: 'https://bswmrfxdadcmuyhmsagv.supabase.co/storage/v1/object/public/portfolio-images/sewing-hero.webp',
  ryan: 'https://bswmrfxdadcmuyhmsagv.supabase.co/storage/v1/object/public/portfolio-images/about-ryan-sewing.webp',
  shop: 'https://bswmrfxdadcmuyhmsagv.supabase.co/storage/v1/object/public/portfolio-images/about-sewing-hero.webp',
} as const;

/** One repair line in a city's own service groups. */
export interface CityServiceItem {
  name: string;
  body: string;
  href?: string;
}

export interface CityServiceGroup {
  heading: string;
  items: CityServiceItem[];
}

export interface ServiceArea {
  slug: string;
  cityName: string;
  state: string;
  region: string;
  localContext: string;
  localServiceFocus: string;
  driveTime: string;
  pickupNote: string;
  heroImage: string;
  heroImageAlt: string;
  metaTitle: string;
  metaDescription: string;
  /*
   * Optional per-city overrides. A city that sets none of these renders the
   * shared template exactly as before. They exist for towns whose search
   * intent differs enough from the template to need their own framing —
   * Telluride, where most impressions are ski-related.
   */
  /** Replaces "Gear & Canvas Repair in <em>City, Colorado</em>". */
  h1?: { lead: string; em: string };
  /** Replaces the italic tagline under the H1. */
  tagline?: string;
  /** Replaces the universal service list with grouped, described repairs. */
  serviceGroups?: CityServiceGroup[];
  /** One plain sentence on what the shop doesn't do, shown under the service groups. */
  notOffered?: string;
  /** Replaces the four logistics cards with numbered how-it-works steps. */
  howItWorks?: { title: string; body: string }[];
  /** Replaces the closing CTA paragraph. */
  ctaBody?: string;
  /**
   * Towns this page covers. Listed in the LocalBusiness areaServed schema, and
   * portfolio jobs whose Location is one of these show as local work.
   */
  servedTowns?: string[];
  /** Page-specific questions, rendered with FAQPage schema. */
  faqs?: { q: string; a: string }[];
}

export const universalServices = [
  'Tipi & Wall Tent Repair',
  'Raft Frame Bag Rebuilds',
  'Drybag & Dry Sack Patches',
  'Backpack & Hipbelt Repair',
  'UTV & Snowmobile Seat Re-upholstery',
  'Boat Cushions & Biminis',
  'RV Awning Modifications',
  'Gym Pad Re-upholstery',
  'Firehouse & Wildland Gear',
  'Commercial Canvas',
] as const;

export const serviceAreas: ServiceArea[] = [
  {
    slug: 'montrose-co',
    cityName: 'Montrose',
    state: 'CO',
    region: 'Uncompahgre Valley',
    localContext:
      "Montrose is home base for Western Slope Stitchworks, sitting in the heart of the Uncompahgre Valley between the San Juan Mountains and the Grand Mesa. It's the gateway to the Black Canyon of the Gunnison, with a deep working-ranch culture, a strong UTV and side-by-side scene, and serious hunting and fishing communities up and down the valley. Whether you're patching a wall tent before elk season, rebuilding a pack hipbelt for a Bears Ears trip, or re-covering UTV seats after a summer of trail riding, gear lives a hard life around here. Having a local industrial sewer in town means you're not boxing it up and shipping it out of state.",
    localServiceFocus:
      'Montrose locals lean into the full Western Slope range — big-game hunting, ranch work, raft trips on the Gunnison, and back-country UTV exploration. That means a heavy mix of canvas wall tents, hunting packs, raft frame bags, ATV/UTV seats, and ranch tarps coming through the shop. The same industrial walking-foot machine handles all of it: canvas, webbing, and heavy vinyl up to about four layers thick.',
    driveTime: 'Right here in town — same-day pickup is usually possible',
    pickupNote: 'Free local pickup any day of the week',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine stitching heavy canvas in the Montrose, CO workshop',
    metaTitle: 'Gear Repair Montrose CO | Tipi, Pack & UTV Seat Repair Shop',
    metaDescription:
      'Industrial gear, canvas, and upholstery repair in Montrose, CO. Tipis, hunting packs, UTV seats, raft frame bags. 3–7 day turnaround. Free local pickup.',
  },
  {
    slug: 'delta-co',
    cityName: 'Delta',
    state: 'CO',
    region: 'Delta County',
    localContext:
      'Delta County covers a lot of different ground. Delta sits where the Gunnison and Uncompahgre rivers meet, Orchard City and Cedaredge climb toward the Grand Mesa, and Hotchkiss, Paonia, and Crawford make up the North Fork country. Between them it’s orchards and hay ground, elk camps on the Mesa, and float trips through the Gunnison Gorge, and all of it is hard on canvas, vinyl, and webbing. The shop is in Olathe, about 15 minutes up US-50 from Delta, so getting gear in and back out is quick.',
    localServiceFocus:
      'Most of what comes in from Delta County is working gear. Wall tents and tipis from Grand Mesa hunting camps, with torn doors, stove-jack burns, and failed zippers. Frame bags and dry bags back from the Gunnison Gorge with worn-through corners and blown seams. Orchard and ag tarps that need new grommets and patched corners after a season of wind, and UTV and ATV seats split by sun and ranch work. It all runs on the same machine, so a truckload of unrelated repairs can come in on one trip and go back together.',
    driveTime: 'About 15 minutes up US-50 from the shop in Olathe',
    pickupNote: 'Free pickup runs most weeks — schedule by phone',
    heroImage: HERO.shop,
    heroImageAlt: 'Canvas and gear repair workbench serving Delta, CO and Delta County',
    metaTitle: 'Canvas & Gear Repair in Delta, CO | Western Slope Stitchworks',
    metaDescription:
      'Tent, tarp, pack, and seat repair for Delta County. Minutes from the shop — text a photo for a quote in 24 hrs, free local pickup.',
    h1: { lead: 'Canvas & Gear Repair in', em: 'Delta, Colorado' },
    tagline:
      'Tents, tarps, packs, and seats for Delta, Cedaredge, Orchard City, Hotchkiss, Paonia, and Crawford — from a shop 15 minutes away in Olathe.',
    serviceGroups: [
      {
        heading: 'Hunting camp & canvas',
        items: [
          {
            name: 'Wall Tents & Tipis',
            body: 'Matched canvas patches, door zippers, stove jacks, and window flaps for Grand Mesa elk camps and outfitter drop camps.',
            href: '/services/canvas-tent-repair/',
          },
          {
            name: 'Ag & Orchard Tarps',
            body: 'Torn corners patched, hems re-sewn, and new grommets set on canvas and vinyl tarps.',
            href: '/services/tarp-bivy-shelter-repair/',
          },
          {
            name: 'Hunting Packs',
            body: 'Hipbelts, shoulder straps, and torn pack bodies on packs that haul out of the high country.',
          },
        ],
      },
      {
        heading: 'River gear',
        items: [
          {
            name: 'Raft Frame Bags',
            body: 'Frame bags and straps worn through on Gunnison Gorge float trips.',
            href: '/services/raft-frame-bag-repair/',
          },
          {
            name: 'Dry Bags',
            body: 'Pinholes and failed seams patched on dry bags and dry sacks.',
          },
        ],
      },
      {
        heading: 'Seats',
        items: [
          {
            name: 'UTV & ATV Seats',
            body: 'Cracked and torn seats re-covered on side-by-sides and ATVs that see ranch work and trail miles.',
            href: '/services/utv-seat-upholstery/',
          },
          {
            name: 'Boat Seats & Biminis',
            body: 'Boat cushions re-covered and bimini tops fitted with new zippers.',
          },
        ],
      },
    ],
    ctaBody:
      'Tent back from elk camp with a torn door, a tarp that lost its grommets, or a UTV seat split down the middle? Text me a photo from Delta County and I’ll come back inside 24 hours with a real number and a turnaround date.',
    servedTowns: ['Delta', 'Cedaredge', 'Orchard City', 'Hotchkiss', 'Paonia', 'Crawford'],
    faqs: [
      {
        q: 'How far is the shop from Delta?',
        a: 'About 15 minutes. The shop is in Olathe, up US-50 between Delta and Montrose, so dropping gear off or picking it up is a short drive. Pickup in Delta is free — text to schedule it.',
      },
      {
        q: 'Do you pick up in Cedaredge, Hotchkiss, Paonia, and Crawford?',
        a: 'Yes. Pickup in Delta is free. Cedaredge, Orchard City, Hotchkiss, Paonia, and Crawford are covered by North Fork pickup routes for a small route fee — text to schedule, or drop gear at the shop when you’re passing through Olathe.',
      },
      {
        q: 'Can you fix a wall tent before hunting season?',
        a: 'Most jobs turn around in 3–7 days. If camp is coming up fast, say so when you text the photo. Rush work is available, and I’ll tell you honestly whether it can make it.',
      },
      {
        q: 'Do you repair ag and orchard tarps?',
        a: 'Yes. Canvas and vinyl tarps get patched, re-hemmed, and fitted with new grommets, whether they cover hay, equipment, or a load in the truck bed. Text a photo and you’ll have a quote within 24 hours.',
      },
    ],
  },
  {
    slug: 'olathe-co',
    cityName: 'Olathe',
    state: 'CO',
    region: 'Uncompahgre Valley',
    localContext:
      "Olathe is the small ag community sitting between Montrose and Delta — best known for sweet corn, and just as well known among locals for the hunting and ranching culture that runs through every block. It's a town where most gear has a working purpose: a tarp on the back of a flatbed, a hunting pack waiting for September, a UTV seat that's seen too many summer days. Olathe is close enough to the shop that a torn piece of canvas can come in on a Monday and go back home fixed by the end of the week — sometimes faster.",
    localServiceFocus:
      "Olathe gear runs working-ag and hunting-heavy. Wall tents and tarps for elk season, ranch and farm canvas, UTV and side-by-side seats that take a beating year-round, and the occasional waterfowl blind or duck pack from someone hitting the river. The shop's industrial machine handles all of it on the same setup — heavy canvas one minute, ballistic nylon the next — so a one-trip drop-off usually covers everything you've got that's torn.",
    driveTime: 'Just 10 miles up the road from our Montrose shop',
    pickupNote: 'Free local pickup, same-day or next-day',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine stitching canvas tarp for Olathe, CO ag and hunting customers',
    metaTitle: 'Gear Repair Olathe CO | Wall Tent, Tarp & UTV Seat Repair',
    metaDescription:
      'Industrial gear and canvas repair for Olathe, CO. Wall tents, ranch canvas, UTV seats, hunting packs. 10 miles from our Montrose shop. Free local pickup.',
  },
  {
    slug: 'ridgway-co',
    cityName: 'Ridgway',
    state: 'CO',
    region: 'San Juan Mountains gateway',
    localContext:
      "Ridgway is the gateway to the San Juans — the last real town before Highway 550 starts climbing toward Ouray and the high country beyond. The community has grown around outdoor recreation: backcountry skiers staging for the Sneffels Range, climbers headed into the Mount Sneffels Wilderness, and a year-round culture of people whose gear actually does work. The mix here skews technical: ultralight backpacks that can't afford a torn hipbelt, ski touring packs that need re-strapping every couple of seasons, and the river-rafting crews running the Uncompahgre and the Gunnison through the summer. Sending it out of state for repair is a non-starter when the season is two weeks away.",
    localServiceFocus:
      "Ridgway customers lean into technical mountain gear — ski touring packs, climbing-adjacent hardware (the auxiliary stuff, not life-safety gear), backcountry shelters, and ultralight tarps. There's a strong river community pushing gear hard each summer, plus a steady run of UTV/ATV repairs from folks exploring the Cimarron and Owl Creek country. The machine setup at the shop handles all of it without compromise — same setup, all weights of fabric.",
    driveTime: 'About 25 minutes south on Highway 550',
    pickupNote: 'Pickup runs weekly for a small route fee — text to schedule',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing repair for Ridgway, CO ski touring and backcountry packs',
    metaTitle: 'Gear Repair Ridgway CO | Backpack, Tent & Climbing Pack Repair',
    metaDescription:
      'Industrial gear repair for Ridgway, CO. Backcountry ski packs, climbing gear, backpack rebuilds, raft & tent repair. 25 min from Montrose. Weekly pickup runs.',
  },
  {
    slug: 'ouray-co',
    cityName: 'Ouray',
    state: 'CO',
    region: 'San Juan Mountains',
    localContext:
      "Ouray earned its reputation honestly — the Switzerland of America, the ice climbing capital of North America, and one of the more technical outdoor communities you'll find anywhere in Colorado. People here own real gear and use it. The Ice Park draws climbers from around the world every winter, the alpine routes in the Sneffels and the surrounding San Juans pull mountaineers into the high country year-round, and the network of jeep roads above town runs a serious community of UTV and side-by-side traffic through the summer. The gear that comes out of Ouray tends to be technical, well-loved, and worth the cost of fixing rather than replacing.",
    localServiceFocus:
      'Ouray gear is technical — ice climbing packs, alpine tents and bivys, backcountry ski rigs, ultralight haul bags, and the abused side-by-side seats of every guide rig in the area. We work on all the auxiliary gear (not life-safety hardware) — restitching hauling straps, replacing worn webbing on packs, patching shelters, and rebuilding shock-absorbed shoulder straps. The shop is also a regular stop for jeep tour operators with seat upholstery that won’t survive another summer.',
    driveTime: 'About 45 minutes south through Ridgway',
    pickupNote: 'Pickup runs through Ridgway weekly — small route fee',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine repairing climbing pack for Ouray, CO mountaineers',
    metaTitle: 'Gear Repair Ouray CO | Ice Climbing Pack & Mountain Gear Repair',
    metaDescription:
      'Industrial gear repair for Ouray, CO. Climbing packs, alpine tents, UTV seats, backcountry ski rigs. 45 min from Montrose. Pickup runs through Ridgway weekly.',
  },
  {
    slug: 'telluride-co',
    cityName: 'Telluride',
    state: 'CO',
    region: 'San Juan Mountains',
    localContext:
      'Telluride runs on two seasons, and both are hard on gear. Winter means ski and board bags thrown in and out of trucks and airport carousels, boot bags zipped past what they were built for, and touring packs worn through on the boot pack. Summer brings the hikers, climbers, river trips, and festival weekends, and the outfitters keep going into the fall hunting season. The shop is in Montrose, about an hour and fifteen minutes away over Dallas Divide, and everything that comes in is sewn by one person on an industrial machine.',
    localServiceFocus:
      'In a two-season town, timing is half the job. Ski and board bags, boot bags, and touring packs are easiest to get done in the spring off-season once the lifts stop turning, so they’re back long before the next winter. Wall tents, river gear, and summer packs fit best into the fall shoulder season. If something fails the week of a trip, text a photo anyway. Rush work is available, and I’ll tell you honestly whether it can turn around in time.',
    driveTime: 'About 1 hour 15 minutes south, over Dallas Divide',
    pickupNote: 'Free pickup from Telluride — text to schedule',
    heroImage: HERO.shop,
    heroImageAlt: 'Inside the Western Slope Stitchworks repair shop, which serves Telluride, CO',
    metaTitle: 'Ski Bag, Winter Gear & Canvas Repair – Telluride, CO | Stitchworks',
    metaDescription:
      'Ski and board bag repair, duffels, packs, zippers, and canvas tents for Telluride. Text a photo for a quote in 24 hrs. Free pickup from Telluride.',
    h1: { lead: 'Winter Gear & Canvas Repair', em: 'for Telluride' },
    tagline: 'Ski bags, duffels, packs, and canvas — sewn repair for Telluride, from a shop just over Dallas Divide.',
    serviceGroups: [
      {
        heading: 'Winter gear',
        items: [
          {
            name: 'Ski & Snowboard Bag Repair',
            body: 'Torn bag bodies, blown seams, ripped handles and shoulder straps, and the end panels that wear through first from dragging.',
          },
          {
            name: 'Boot Bags & Duffels',
            body: 'Split zippers, torn end panels, and handles pulled loose by a bag packed heavier than it was built for.',
          },
          {
            name: 'Backpacks & Hipbelts',
            body: 'Touring packs and daypacks: hipbelt rebuilds, torn pack bodies, and shoulder harness repairs.',
            href: '/services/#outdoor',
          },
          {
            name: 'Zipper Replacement',
            body: 'New zippers on ski bags, duffels, boot bags, and packs, sized for the load the bag actually carries.',
          },
          {
            name: 'Straps & Webbing',
            body: 'Carry straps, compression straps, ski straps, and buckles re-sewn or replaced.',
            href: '/services/strap-webbing-repair/',
          },
        ],
      },
      {
        heading: 'Year-round',
        items: [
          {
            name: 'Wall Tents & Tipis',
            body: 'Matched canvas patches, zippers, stove jacks, and window flaps for hunting camps and summer basecamps.',
            href: '/services/canvas-tent-repair/',
          },
          {
            name: 'Raft & River Gear',
            body: 'Raft frame bags, dry bags, and straps for river season on the San Miguel and beyond.',
            href: '/services/raft-frame-bag-repair/',
          },
          {
            name: 'UTV & Snowmobile Seats',
            body: 'Torn and cracked seats re-covered on side-by-sides for summer roads and snowmobiles for winter.',
            href: '/services/utv-seat-upholstery/',
          },
        ],
      },
    ],
    notOffered:
      'I don’t tune skis or repair bases and edges — for that, see a Telluride ski shop. If it’s sewn, bring it here.',
    howItWorks: [
      { title: 'Text a Photo', body: 'Send a photo of the damage. One picture usually tells me what’s involved.' },
      { title: 'Quote in 24 Hours', body: 'An honest number and a turnaround date, with no fee to ask.' },
      { title: 'Free Pickup from Telluride', body: 'Text to schedule a pickup. The shop is about an hour and fifteen minutes away over Dallas Divide.' },
      { title: 'Back in 3–7 Days', body: 'Most jobs are done in 3–7 days, and rush work is available. Your gear comes back the same way it left.' },
    ],
    ctaBody:
      'Ski bag with a blown seam, a duffel zipper that quit, or a wall tent that needs work before hunting season? Text me a photo from Telluride and I’ll come back inside 24 hours with a real number and a turnaround date.',
  },
  {
    slug: 'grand-junction-co',
    cityName: 'Grand Junction',
    state: 'CO',
    region: 'Grand Valley',
    localContext:
      "Grand Junction is the largest city in the region and the practical hub of the Western Slope's outdoor economy. It's the staging point for Ruby/Horsethief and Westwater raft launches, the home of the Lunch Loops mountain bike system, and the closest urban support for the wine country and orchards stretched along the Colorado River. That means a wide mix of gear running through the shop — rafts, frame bags, dry bags, mountain bike packs, river guides' commercial canvas, and the awnings, restaurant canvas, and commercial vehicle upholstery that come with a city this size. Working with a local industrial sewer cuts shipping out of the equation — most repairs go from drop-off to done inside a week.",
    localServiceFocus:
      "Grand Junction's gear runs across the full spectrum. Raft frame bags, drybag patches, and PFD repair from the river outfitters; mountain biking packs and hydration rigs from the Lunch Loops crowd; commercial awnings, restaurant booths, and gym pad re-upholstery from the city's larger commercial scene. The shop runs heavy canvas, ballistic nylon, and vinyl on the same setup, so commercial-account work and personal gear repair share the same bench, the same machine, and the same turnaround.",
    driveTime: 'About 1 hour north of our Montrose shop',
    pickupNote: 'Pickup runs weekly for a small route fee',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine repairing raft frame bag for Grand Junction, CO river outfitters',
    metaTitle: 'Gear Repair Grand Junction CO | Raft, Bike Pack & Canvas Repair',
    metaDescription:
      'Industrial gear, raft, and canvas repair for Grand Junction, CO. Frame bags, biking packs, awnings, commercial canvas. 1 hr from Montrose. Weekly pickup runs.',
  },
  {
    slug: 'fruita-co',
    cityName: 'Fruita',
    state: 'CO',
    region: 'Grand Valley',
    localContext:
      "Fruita has built a national name on mountain biking — 18 Road, the Kokopelli, the Lunch Loops a few miles east — and the town's bike-shop and outdoor-gear culture runs deep. It's also one of the closer towns to the Ruby/Horsethief stretch of the Colorado, which means rafters and river guides cycle through gear at a steady summer clip. The growing food and wine economy adds restaurant and commercial canvas to the mix. Whatever you're riding or running, gear here gets used hard — and getting it fixed locally rather than mailed away saves the kind of time that matters when the next trip is on the calendar.",
    localServiceFocus:
      'Fruita sends through a heavy mix of mountain-biking gear — pack rebuilds, bikepacking frame bags, hydration sleeves, and torn bike-touring shelters — plus rafts, dry bags, and frame bags from the Colorado River crew. There’s also a steady stream of UTV and side-by-side seats from the desert traffic out toward the Book Cliffs. Same shop, same machine, same person — all of it gets handled together rather than rotated through subcontractors.',
    driveTime: 'About 1 hour 15 minutes north',
    pickupNote: 'Pickup runs alongside Grand Junction routes weekly — small route fee',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing repair for Fruita, CO mountain biking and rafting community',
    metaTitle: 'Gear Repair Fruita CO | Bikepacking, Raft & Frame Bag Repair',
    metaDescription:
      'Industrial gear repair for Fruita, CO. Bikepacking bags, raft frame bags, UTV seats, dry bag repair. 1 hr 15 from Montrose. Pickup with GJ routes.',
  },
  {
    slug: 'cedaredge-co',
    cityName: 'Cedaredge',
    state: 'CO',
    region: 'Grand Mesa gateway',
    localContext:
      "Cedaredge sits at the foot of the Grand Mesa, the gateway town for one of the largest flat-topped mountains in the world and a year-round outdoor playground. Hunting and fishing on the Mesa pull people through every season — elk and deer in the fall, ice fishing through the winter, lake trout and trout streams through summer. It's a small ag community at heart, with orchard country running down the slope toward the North Fork. Gear here lives in harsh sun half the year and snow the other half, which means it tears, fades, and breaks at a steady clip — and getting it fixed locally is a real consideration.",
    localServiceFocus:
      "Cedaredge gear is ag- and hunting-heavy. Wall tents headed for the Mesa, ice fishing shelters that need patching every spring, ranch and orchard tarps, and the regular flow of UTV and side-by-side seats that come with high-elevation summer use. Snowmobile seats too — most of the Mesa snowmobile community stages through here. The shop's industrial walking-foot machine handles canvas, vinyl, and webbing without rotation through different setups.",
    driveTime: 'About 45 minutes north over the Uncompahgre Plateau',
    pickupNote: 'Pickup available with North Fork routes for a small route fee — text to schedule',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine repairing wall tent for Cedaredge, CO Grand Mesa hunting customers',
    metaTitle: 'Gear Repair Cedaredge CO | Wall Tent & Snowmobile Seat Repair',
    metaDescription:
      'Industrial gear repair for Cedaredge, CO. Wall tents, snowmobile seats, ranch canvas, UTV upholstery. 45 min from Montrose. Pickup with North Fork routes.',
  },
  {
    slug: 'hotchkiss-co',
    cityName: 'Hotchkiss',
    state: 'CO',
    region: 'North Fork Valley',
    localContext:
      "Hotchkiss is the working heart of the North Fork Valley — small ranches, organic farms, vineyards and the food-and-wine economy that's grown up alongside them, and the old-line ranching community that's been there longer than any of it. The valley runs hunting hard in the fall, with deep elk and deer country on either side. Gear here covers a wide range: working ranch canvas, organic-farm structures, hunting wall tents, raft and packraft repair from the Gunnison and North Fork crowd, and the occasional commercial canvas job from a vineyard or restaurant. A 50-minute drive to the shop in Montrose is short enough that fixing it locally beats every alternative.",
    localServiceFocus:
      "Hotchkiss gear runs working-ag and hunting-heavy, with a small but distinct food-and-wine commercial canvas thread running through it. Wall tents, ranch tarps, irrigation gear, hunting packs, and the rafts and dry bags of the North Fork river community — all common visitors to the bench. The shop's setup runs heavy canvas, webbing, and vinyl on the same machine, which means a one-trip North Fork drop-off can usually clear a whole pile.",
    driveTime: 'About 50 minutes north into the North Fork',
    pickupNote: 'Pickup runs weekly with the North Fork loop — small route fee',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing machine repairing ranch canvas for Hotchkiss, CO North Fork customers',
    metaTitle: 'Gear Repair Hotchkiss CO | Ranch Canvas & Hunting Tent Repair',
    metaDescription:
      'Industrial gear repair for Hotchkiss, CO. Wall tents, ranch canvas, hunting packs, raft repair. 50 min from Montrose. Weekly North Fork pickup loop.',
  },
  {
    slug: 'paonia-co',
    cityName: 'Paonia',
    state: 'CO',
    region: 'North Fork Valley',
    localContext:
      "Paonia has its own identity inside the North Fork — organic agriculture, fruit orchards, an active food-and-wine community, and a working coal-country backbone that's been transitioning hard for the last decade. The land around it pulls hunters into deep elk and deer country every fall, and the Gunnison and North Fork rivers see steady traffic through the summer. Locals here run gear hard across an unusually wide range — a single household might own a wall tent, a packraft, a UTV, and a commercial farm awning all at once. Having a local industrial sewer means none of that gear has to ship to Salt Lake or Denver and wait in someone else's queue for three weeks.",
    localServiceFocus:
      "Paonia gear is wide-spectrum — wall tents, ranch tarps, packrafts and dry bags, UTV seats, hunting pack rebuilds, and the occasional vineyard canvas job. The North Fork's rafting and packrafting community sends through a steady run of frame-bag and dry-bag work each summer too. The shop's industrial walking-foot setup handles all of it without rotation, which keeps turnaround tight even when a Paonia drop-off includes four unrelated repairs in one trip.",
    driveTime: 'About 1 hour north into the North Fork',
    pickupNote: 'Pickup runs weekly with the North Fork loop — small route fee',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing repair for Paonia, CO North Fork ranch and packraft community',
    metaTitle: 'Gear Repair Paonia CO | Wall Tent, Packraft & Ranch Canvas Repair',
    metaDescription:
      'Industrial gear repair for Paonia, CO. Wall tents, packrafts, ranch canvas, UTV seats, hunting packs. 1 hr from Montrose. Weekly North Fork pickup loop.',
  },
  {
    slug: 'crested-butte-co',
    cityName: 'Crested Butte',
    state: 'CO',
    region: 'Gunnison Valley',
    localContext:
      "Crested Butte runs on technical outdoor recreation. It's a high-alpine ski town in the winter, one of the original cradles of mountain biking in the summer, and an outdoor-industry-adjacent community year-round. People here own gear because they use it — every weekend, every weekday, every season. The trail system off Snodgrass and the descents off Mount Crested Butte keep mountain bike gear churning through the summer; the backcountry off Kebler Pass and Cement Creek runs ski touring packs into the spring. Add a strong climbing, fly-fishing, and packrafting community and you've got one of the more demanding gear scenes on the Western Slope. Repair-friendly gear is part of the local culture.",
    localServiceFocus:
      'Crested Butte sends through technical gear — mountain bike packs, bikepacking frame bags, ski touring packs, alpine bivys, and high-end packs that need hipbelt and webbing rebuilds. Climbing-adjacent packs and shelters, packrafts, and the occasional commercial outfitter canvas job round out the rest. The shop runs canvas, ballistic nylon, and heavy webbing on the same machine, so a multi-piece drop-off from one CB customer goes through together rather than getting split up.',
    driveTime: 'About 2 hours east through Gunnison',
    pickupNote: 'Pickup runs alongside Gunnison routes for a small route fee — text to schedule',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing repair for Crested Butte, CO mountain biking and ski touring community',
    metaTitle: 'Gear Repair Crested Butte CO | MTB Pack & Ski Touring Repair',
    metaDescription:
      'Industrial gear repair for Crested Butte, CO. MTB packs, ski touring rigs, frame bags, alpine gear. 2 hr from Montrose. Pickup with Gunnison routes.',
  },
  {
    slug: 'gunnison-co',
    cityName: 'Gunnison',
    state: 'CO',
    region: 'Gunnison Valley',
    localContext:
      "Gunnison is hunting and fishing country at its best — an agricultural valley, a college town built around Western Colorado University, and the supply hub for one of the most serious outfitter communities in the state. The Taylor and Gunnison Rivers, the East River, and the high lakes off Crested Butte's south end keep fly anglers moving year-round; the surrounding GMUs run elk and deer hunting at a national-draw level every fall. Gear here is functional, beat-up, and worth fixing — that's the working-class outdoor culture of the valley. Outfitters running camp gear, hunters running pack systems, and ranchers running canvas tarps are all part of the same regular rotation through the shop.",
    localServiceFocus:
      "Gunnison gear is hunting and fishing-heavy. Wall tents and outfitter canvas headed for the high country every fall, hunting pack rebuilds — hipbelts, shoulder straps, frame webbing — drift boat covers and bimini work for the Taylor and Gunnison rivers, and the occasional commercial repair from a guide service. The shop's industrial walking-foot machine, set up to handle the heaviest layers, keeps turnaround tight even when a single outfitter drops off ten pieces at once.",
    driveTime: 'About 1 hour 45 minutes east on Highway 50',
    pickupNote: 'Pickup runs weekly for a small route fee',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing repair for Gunnison, CO hunting and fishing outfitter community',
    metaTitle: 'Gear Repair Gunnison CO | Hunting Pack & Outfitter Canvas Repair',
    metaDescription:
      'Industrial gear repair for Gunnison, CO. Hunting packs, outfitter wall tents, drift boat covers, fly fishing gear. 1 hr 45 from Montrose. Weekly pickup.',
  },
];

export const findServiceArea = (slug: string): ServiceArea | undefined =>
  serviceAreas.find((a) => a.slug === slug);

/**
 * Nearby-area cross-link map for internal linking / SEO. Each service-area
 * page links to 2–3 geographic neighbors. Weighted so Montrose, Ridgway,
 * and Grand Junction (the hub pages) receive the most inbound links.
 */
const NEARBY: Record<string, string[]> = {
  'montrose-co': ['delta-co', 'olathe-co', 'ridgway-co'],
  'delta-co': ['montrose-co', 'cedaredge-co', 'grand-junction-co'],
  'olathe-co': ['montrose-co', 'delta-co', 'ridgway-co'],
  'ridgway-co': ['ouray-co', 'montrose-co', 'telluride-co'],
  'ouray-co': ['ridgway-co', 'telluride-co', 'montrose-co'],
  'telluride-co': ['ridgway-co', 'ouray-co', 'montrose-co'],
  'grand-junction-co': ['fruita-co', 'delta-co', 'montrose-co'],
  'fruita-co': ['grand-junction-co', 'delta-co', 'montrose-co'],
  'cedaredge-co': ['delta-co', 'hotchkiss-co', 'grand-junction-co'],
  'hotchkiss-co': ['paonia-co', 'cedaredge-co', 'delta-co'],
  'paonia-co': ['hotchkiss-co', 'cedaredge-co', 'delta-co'],
  'crested-butte-co': ['gunnison-co', 'montrose-co', 'ridgway-co'],
  'gunnison-co': ['crested-butte-co', 'montrose-co', 'grand-junction-co'],
};

/** Resolve a slug's nearby areas to full ServiceArea objects (order preserved). */
export const getNearbyAreas = (slug: string): ServiceArea[] =>
  (NEARBY[slug] ?? [])
    .map((s) => serviceAreas.find((a) => a.slug === s))
    .filter((a): a is ServiceArea => Boolean(a));
