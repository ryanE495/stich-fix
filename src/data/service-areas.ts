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
    region: 'North Fork country',
    localContext:
      "Delta sits at the confluence of the Uncompahgre and Gunnison Rivers — the working agricultural heart of the Western Slope. It's ranching country and orchard country: long days on a tractor, irrigation gear that gets dragged through everything, and a hunting culture that runs deep through the North Fork and into the West Elks. Locals here know what it costs to keep gear running on a working budget. Replacing a torn tarp or a blown-out seat isn't how anyone wants to spend their money, and a local industrial repair shop a 20-minute drive away keeps that gear in service one more season — two more, however many it needs.",
    localServiceFocus:
      'Delta gear leans heavily agricultural and hunting — wall tents headed for elk camp, irrigation tarps, ranch upholstery, and the occasional drift boat or river raft headed for the Gunnison. UTV and side-by-side seats see a lot of work too, between farm work and recreation. The shop runs heavy canvas, webbing, and vinyl on the same machine, so a stack of unrelated repairs from one Delta drop-off can usually go through together.',
    driveTime: 'About 20 minutes north of our shop in Montrose',
    pickupNote: 'Free pickup runs most weeks — schedule by phone',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing machine and canvas work bench serving Delta, CO and the North Fork',
    metaTitle: 'Gear Repair Delta CO | Wall Tent, Canvas & UTV Seat Repair',
    metaDescription:
      'Industrial gear and canvas repair serving Delta, CO and the North Fork. Wall tents, UTV seats, ranch canvas. 20 minutes from our Montrose shop. Free pickup.',
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
    pickupNote: 'Free pickup runs weekly — text to schedule',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing repair for Ridgway, CO ski touring and backcountry packs',
    metaTitle: 'Gear Repair Ridgway CO | Backpack, Tent & Climbing Pack Repair',
    metaDescription:
      'Industrial gear repair for Ridgway, CO. Backcountry ski packs, climbing gear, backpack rebuilds, raft & tent repair. 25 min from Montrose. Free local pickup.',
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
    pickupNote: 'Pickup runs through Ridgway weekly',
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
      "Telluride is a place where premium outdoor gear earns its money. The ski resort drives the winter economy and the wider mountain culture — touring packs, helmets, technical apparel that's seen serious use — but the real depth of Telluride's outdoor scene shows up in summer. The Sneffels Highline, the Wilson Group, and the routes pulling north into the Lizard Head Wilderness keep climbers, hikers, and trail runners moving through gear at a steady clip. Add the festival season, the strong commercial outfitter presence, and an affluent customer base that values keeping high-end gear running rather than throwing it away — you've got a community that genuinely needs a local industrial sewer.",
    localServiceFocus:
      'Telluride leans premium and technical. The shop sees high-end backpacks needing hipbelt rebuilds and zipper replacements, ski touring packs torn on the boot pack, alpine bivys with blown-out seam tape, and a regular run of commercial gear from outfitters and guide services. Restaurant booth and event canvas work comes out of the resort and the festival circuit too. Same machine, same hands — no rotation through subcontractors.',
    driveTime: 'About 1 hour 15 minutes south, over Dallas Divide',
    pickupNote: 'Pickup available — text to coordinate timing',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial gear repair shop serving Telluride, CO ski touring and alpine community',
    metaTitle: 'Gear Repair Telluride CO | Ski Pack, Hipbelt & Alpine Gear Repair',
    metaDescription:
      'Industrial gear repair for Telluride, CO. Ski touring packs, alpine gear, hipbelt rebuilds, commercial canvas. 1 hr 15 from our Montrose shop. Pickup available.',
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
    pickupNote: 'Free pickup runs weekly',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing machine repairing raft frame bag for Grand Junction, CO river outfitters',
    metaTitle: 'Gear Repair Grand Junction CO | Raft, Bike Pack & Canvas Repair',
    metaDescription:
      'Industrial gear, raft, and canvas repair for Grand Junction, CO. Frame bags, biking packs, awnings, commercial canvas. 1 hr from Montrose. Free local pickup.',
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
    pickupNote: 'Free pickup runs alongside Grand Junction routes weekly',
    heroImage: HERO.shop,
    heroImageAlt: 'Industrial sewing repair for Fruita, CO mountain biking and rafting community',
    metaTitle: 'Gear Repair Fruita CO | Bikepacking, Raft & Frame Bag Repair',
    metaDescription:
      'Industrial gear repair for Fruita, CO. Bikepacking bags, raft frame bags, UTV seats, dry bag repair. 1 hr 15 from Montrose. Free pickup with GJ routes.',
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
    pickupNote: 'Pickup available with North Fork routes — text to schedule',
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
    pickupNote: 'Pickup runs weekly with the North Fork loop',
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
    pickupNote: 'Pickup runs weekly with the North Fork loop',
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
    pickupNote: 'Pickup runs alongside Gunnison routes — text to schedule',
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
    pickupNote: 'Pickup runs weekly',
    heroImage: HERO.sewing,
    heroImageAlt: 'Industrial sewing repair for Gunnison, CO hunting and fishing outfitter community',
    metaTitle: 'Gear Repair Gunnison CO | Hunting Pack & Outfitter Canvas Repair',
    metaDescription:
      'Industrial gear repair for Gunnison, CO. Hunting packs, outfitter wall tents, drift boat covers, fly fishing gear. 1 hr 45 from Montrose. Weekly pickup.',
  },
];

export const findServiceArea = (slug: string): ServiceArea | undefined =>
  serviceAreas.find((a) => a.slug === slug);
