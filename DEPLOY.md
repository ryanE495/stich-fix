# Deploy Checklist — Western Slope Stitchworks

## Before first deploy

Binary assets referenced in `<head>` / webmanifest that need to be generated and dropped into `public/`:

- `public/og-image.jpg` — 1200×630, used by Open Graph / Twitter Card
- `public/logo.png` — square, used by `LocalBusiness.logo` in JSON-LD
- `public/favicon.ico` — 32×32
- `public/favicon-16.png` — 16×16
- `public/favicon-32.png` — 32×32
- `public/apple-touch-icon.png` — 180×180

Generator tip: https://realfavicongenerator.net will produce all five favicon sizes + the manifest in one pass from a single source image.

## Build & deploy

```bash
npm install
npm run build   # writes to dist/ — outputs sitemap-index.xml + sitemap-0.xml automatically
```

Drop `dist/` onto any static host (Netlify, Vercel, Cloudflare Pages, S3, GH Pages). The `site` field in `astro.config.mjs` must stay as `https://westernslopestitchworks.com` — the sitemap integration won't emit URLs without it.

`robots.txt` points at `/sitemap-index.xml` (the file `@astrojs/sitemap` actually generates — a plain `/sitemap.xml` is not produced).

## After deploy — Ryan's manual steps

These are the highest-ROI SEO moves for a local service business. Do them in this order:

1. **Google Search Console** — https://search.google.com/search-console
   - Verify the domain (DNS TXT or HTML file)
   - Submit `https://westernslopestitchworks.com/sitemap-index.xml`

2. **Bing Webmaster Tools** — https://www.bing.com/webmasters
   - Verify the domain and submit the same sitemap URL
   - Bing also powers DuckDuckGo results

3. **Google Business Profile** — https://business.google.com
   - This is the single highest-impact step for a local service business. It's what makes you show up in the map pack when someone searches "canvas repair Montrose".
   - Add: name, phone, service area (Delta / Montrose / GJ / Ridgway / Ouray / Telluride), hours, photos of your shop and work, service categories.

4. **Local directory listings** — add the business to:
   - Yelp
   - Nextdoor (the Montrose neighborhood in particular)
   - Facebook Business Page

5. **Reviews** — ask your first 3 paying customers for a Google review. Send them the direct review link from your Business Profile rather than "search for us on Google." Conversion is 3–5× higher.

## Portfolio (Supabase-backed)

The `/portfolio` archive and per-item detail pages are statically generated from the shared Supabase project at **build time**. Source code lives in `src/lib/portfolio.ts` and `src/pages/portfolio/`.

**Required env vars** (set in Netlify → Site settings → Environment variables):

- `SUPABASE_URL` — e.g. `https://xxxxxxxxxxxx.supabase.co`
- `SUPABASE_ANON_KEY` — the public anon key. RLS on `stitchworks_portfolio_items` restricts the anon role to rows where `status = 'published'`, so only published items ever ship to the public site.

There is a `.env.example` in the repo root showing the shape. Copy to `.env` for local builds (`.env` is git-ignored).

**Behavior when env vars are missing or Supabase is unreachable:**
- `/portfolio/` renders a graceful "Work samples coming soon" empty state.
- No detail pages are generated.
- Homepage Recent Work block is omitted entirely.
- Build still succeeds — the fetchers swallow errors and return `[]`.

**Routes are generated from the title** (slugified, with an 8-char id fragment appended on collision) since the table has no `slug` column.

**To refresh the portfolio after Ryan publishes new items in the CMS:** trigger a Netlify rebuild (Deploys → Trigger deploy → Deploy site). The portfolio rebuilds against the latest published rows at build time; no in-page client fetch.

## Contact form — Netlify Forms

The contact form (`src/pages/contact.astro`) is wired to **Netlify Forms**:

- `data-netlify="true"` on the `<form>` tag — Netlify's build plugin scans the static HTML at deploy time and registers the form.
- `enctype="multipart/form-data"` so the three optional photo uploads ride along.
- `data-netlify-honeypot="bot-field"` + a visually hidden `bot-field` input = basic spam trap.
- On success the browser redirects to `/thanks` (`src/pages/thanks.astro`).

**To receive submissions:**
1. Deploy the site to Netlify (the form only works on Netlify hosting).
2. In the Netlify dashboard → **Forms**, the `contact` form will appear after the first deploy.
3. Add a notification: **Forms → contact → Settings & usage → Form notifications → Add notification → Email** (send to Ryan's inbox, or Slack / webhook).
4. File attachments are stored by Netlify and linked from each submission — paid plans raise the size/volume limits; the free tier is fine for a small local business.

If the site moves off Netlify later, swap the form handler to Formspree, Basin, or a custom `/api/contact` endpoint and remove the `data-netlify-*` attributes.

## Notes on what's in the code vs. the SEO spec

- **Email** is omitted from JSON-LD and `humans.txt` by your earlier instruction — add back into `LocalBusiness` in `src/pages/index.astro` when you have one.
- **Phone** is set to `+1-970-275-7962` in `src/config/site.ts` (`seo.telephoneE164`).
- **Logo / OG image** URLs in JSON-LD point at `/logo.png` and `/og-image.jpg` — these 404 until you upload the files (step 1 above).
