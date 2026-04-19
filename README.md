# Western Slope Stitchworks — Astro Site

Static Astro site for a gear and canvas repair shop in Montrose, CO. Designed to be picked up and extended in Claude Code.

## Stack

- **Astro 4.x** — static site generator, zero-JS by default
- **TypeScript** (strict) for config/data files
- **Plain CSS** (no Tailwind/PostCSS) — one global stylesheet + scoped `<style>` per page
- No UI framework (no React/Vue) — Astro components only

## Run locally

```bash
cd astro
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
npm run preview  # preview the build
```

## File map

```
astro/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   └── favicon.svg
└── src/
    ├── config/
    │   ├── site.ts          ← Phone, email, hours, nav, service area
    │   └── services.ts      ← All pricing + categories (data-driven)
    ├── styles/
    │   └── global.css       ← Nav, buttons, typography, footer, placeholders
    ├── layouts/
    │   └── Layout.astro     ← <html>/<head>/SEO + LocalBusiness JSON-LD
    ├── components/
    │   ├── Nav.astro
    │   └── Footer.astro
    └── pages/
        ├── index.astro      ← Home (hero, personal, services, trust, who, final CTA)
        ├── services.astro   ← Price list (rendered from config/services.ts)
        └── contact.astro    ← Intake form + details + service area
```

## Where to edit common things

| You want to change... | Edit this file |
| --- | --- |
| Phone number, email, hours, location | `src/config/site.ts` |
| Nav items | `src/config/site.ts` (`nav` array) |
| Pricing, services, categories | `src/config/services.ts` |
| Colors, type scale, button style | `src/styles/global.css` (`:root` tokens) |
| Page-specific layout | `<style>` block in that page's `.astro` file |
| SEO title/description defaults | `src/layouts/Layout.astro` |

## Design system

### Palette (CSS custom properties in `global.css`)

- `--canvas` `#EBDFC5` — primary warm tan
- `--canvas-light` `#F4ECD8` — page background
- `--canvas-dark` `#D9C9A8` — hover states
- `--river` `#3F5248` — deep muted green, secondary brand color
- `--charcoal` `#201E1C` — near-black for type + buttons
- `--ink` `#2B2826` — body text
- `--rust` `#B8542E` — accent (use sparingly — links, numerals, italics)
- `--muted` `#6B6560` — secondary text
- `--rule` / `--rule-strong` — hairline borders

### Type

- **Serif** (Fraunces) — headings and editorial emphasis. Italic serif used for secondary clauses in `<em>` tags (colored `--river` or `--rust`)
- **Sans** (Inter) — body, UI, buttons
- **Mono** (system ui-monospace) — eyebrows, captions, section numbers

### Buttons

One button style, two variants:
- `.btn` — filled charcoal (primary)
- `.btn .btn-secondary` — outlined, fills on hover

Do not introduce a third. The spec calls for one button repeated everywhere.

### Placeholders

`.ph` divs with `data-label="..."` render a tan diagonal-stripe placeholder with the label overlaid. Replace with `<img>` tags as real photos come in. Placeholders are marked in the markup for where photos are expected (hero, portrait).

## TODOs for Claude Code

Ordered by priority:

### 1. Fill in the real phone number

Update `phoneDisplay` and `phoneHref` in `src/config/site.ts`:

```ts
phoneDisplay: '(970) 555-1234',
phoneHref: 'tel:+19705551234',
```

All references across the site (nav, hero, CTAs, footer) pull from this one place.

### 2. Wire up the contact form

The contact form (`src/pages/contact.astro`) POSTs to `/api/contact` but has no backend yet. Pick one:

- **Netlify Forms** — add `netlify` and `name="contact"` attributes to the `<form>`, then deploy to Netlify
- **Formspree** — change `action` to your Formspree endpoint
- **Custom API route** — add an Astro SSR adapter (`@astrojs/node` or similar), then create `src/pages/api/contact.ts` that validates input and forwards to email (Resend, Postmark)

File uploads (the 3 photo slots) need separate handling:
- Netlify Forms supports file uploads natively
- Otherwise use a pre-signed S3/R2 URL flow, or a service like Uploadcare/Cloudinary

Server-side: send to `ryan@westernslopestitchworks.com` and consider an SMS notification (Twilio) since the client prefers texts.

### 3. Add real photos

Drop photos into `public/images/` and replace the `<div class="ph ...">` placeholders with `<img>` tags. Target photos (see `data-label` attrs in the markup for guidance):

- Hero: industrial machine mid-stitch on canvas
- Personal section: Ryan portrait in the shop

Use Astro's `<Image>` component from `astro:assets` for automatic optimization:

```astro
---
import { Image } from 'astro:assets';
import heroImg from '../assets/hero.jpg';
---
<Image src={heroImg} alt="Industrial machine stitching canvas" width={800} />
```

### 4. Replace placeholder "Plate" captions

The tan-stripe placeholder divs in `index.astro` currently show "Plate 01 / Workshop" etc. Once real photos are in, either remove the caption or replace with a real credit/location line.

### 5. Analytics, sitemap, robots.txt

- Install `@astrojs/sitemap` integration for automatic sitemap generation
- Add a `public/robots.txt`
- Drop in Plausible/Fathom/GA as appropriate (avoid heavy trackers on a local-service site)

### 6. Optional: OG image

Add a static OG image at `public/og.png` (1200×630) and set `<meta property="og:image">` in `Layout.astro`. Can generate at build time with `@vercel/og` or `satori`.

## Deployment

Static output — deploys anywhere:

- **Netlify** — `npm run build`, publish `dist/`. Enables Netlify Forms if form is wired.
- **Vercel** — zero-config, detects Astro
- **Cloudflare Pages** — build command `npm run build`, output `dist`
- **GitHub Pages** — set `site` and `base` in `astro.config.mjs`

## Notes on structure

- **Data-driven pricing**: the services page renders from `config/services.ts`. Add/remove/reorder items without touching markup.
- **`data-screen-label` attributes** on sections are harmless in production — feel free to strip during a cleanup pass, or leave for accessibility landmarks.
- **No JavaScript** ships to the client except the tiny urgency-radio toggle in `contact.astro`. Keep it that way if possible.
- **Scoped styles**: each page owns its page-specific CSS via Astro's `<style>` blocks. Shared primitives (buttons, nav, footer, typography) live in `global.css`.

## Original design source

The original single-file HTML prototype (with the same design) lives at the project root: `index.html`, `services.html`, `contact.html`, `styles.css`. Use them as visual reference if anything looks off after changes — they're the canonical pixel target.
