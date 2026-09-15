# Deploy Checklist — Western Slope Stitchworks

## Binary assets — DONE (generated, in `public/`)

These were missing and 404ing in production; all six now exist:

- `public/og-image.jpg` — 1200×630, Open Graph / Twitter Card. Shop photo with
  a charcoal scrim + brand text.
- `public/logo.png` — 512×512, used by `LocalBusiness.logo` in JSON-LD
- `public/favicon.ico` — 32×32 (PNG-in-ICO)
- `public/favicon-16.png`, `public/favicon-32.png`, `public/apple-touch-icon.png`

All derive from the `public/favicon.svg` brand mark (charcoal ground, cream
serif "W"). To replace with professionally designed versions later, just drop
new files at the same paths — nothing in the code needs to change.
https://realfavicongenerator.net produces the whole favicon set in one pass.

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

## Mail-in shipping estimate — Netlify Function

`/api/shipping-estimate` is a Netlify Function (`netlify/functions/shipping-estimate.ts`). It's the only server code on the site; everything else stays statically built, so there's no Astro adapter. Netlify finds and bundles the function automatically on deploy.

**Setup:**
1. Get an EasyPost API key. Start with the **test** key (begins with `EZTK`).
2. Netlify dashboard → **Site configuration → Environment variables** → add `EASYPOST_KEY`. Scope it to Functions. Do not name it `VITE_…` — that would put it in the browser bundle.
3. Redeploy.
4. When ready to launch, swap in the production key (`EZAK…`) and redeploy.

**What it does:** rates the customer's box from 81425 to their ZIP (ZIP and country only, plus whether it's a residential address so the carrier's residential surcharge is included), takes the cheapest ground service, doubles it for round trip, pads the high end 15%, and returns a range. Live results are cached for 24 hours in function memory, keyed by the first 3 digits of the destination ZIP, residential or business, and the box.

**Rate limit:** 20 EasyPost lookups per client IP per hour (cache hits don't count). Over the limit the endpoint returns the "roughly" estimate instead of an error. The counter lives in function memory, so it's a per-instance cap, not a global one. Change the number in `SHIPPING_ESTIMATE.rateLimitPerHour`.

**Failure is safe:** with no key, a carrier error, a 5-second timeout, or the rate limit hit, it returns a "roughly" estimate from the static zone table (`src/lib/mail-in/shipping-zones.ts`). The browser does the same if the endpoint itself can't be reached. A shipping problem never blocks a request.

**Local development:** plain `npm run dev` doesn't run Netlify Functions, so the form always shows "roughly" estimates locally. To exercise live rates, run the site with `netlify dev` (Netlify CLI) with `EASYPOST_KEY` in your local `.env`.

## Mail-in repair requests — Supabase

Requests from `/mail-in-repair/start` are saved to the shared Supabase project, in `repair_requests` and `repair_photos` plus a private `repair-photos` storage bucket. The schema, security rules, and bucket all come from one migration: `supabase/migrations/20260914120000_repair_requests.sql`.

**Setup (once, before launch):**
1. **Turn off public sign-ups.** Supabase dashboard → **Authentication → Sign In / Providers** → disable "Allow new users to sign up". Any signed-in user gets full read access to these tables for the admin UI. With sign-ups open, anyone could make an account and read customer names, phones, and emails.
2. **Apply the migration.** Either paste the file into **SQL Editor** and run it, or `supabase link` then `supabase db push`. It's safe to re-run.
3. **Check it:** **Table Editor** should show RLS enabled on both tables, and **Storage** should show `repair-photos` as a private bucket.
4. No new environment variables. The form uses the same `SUPABASE_URL` / `SUPABASE_ANON_KEY` as the portfolio, baked into the page at build time. Redeploy after applying the migration.

**Keys:** only the anon key is ever used, and it's public by design. The build fails if `SUPABASE_ANON_KEY` holds a service-role or secret key, so one can't reach the browser by mistake. The service-role key is not used anywhere on this site. Never add it to Netlify env vars, and never with a `VITE_` or `PUBLIC_` prefix.

**What anon can do:**
- **Nothing on the tables directly.** No select, insert, update, or delete, and no RLS policies for anon at all.
- **Call `submit_repair_request(payload)`.** It validates every field, ignores any `status` / `internal_notes` / `request_number` / `id` in the payload, and returns only the new id and `WSS-####` number. It rejects a filled honeypot or a form finished in under 10 seconds. A retry with the same `client_submission_id` returns the same request instead of creating a second one.
- **Upload into `repair-photos/{request_id}/{full|damage|tag}.jpg`,** for a request created in the last 15 minutes. Anon has no read access, so photos are viewed through signed URLs from the admin UI.
- **Call `attach_repair_photo(...)`.** It works only in the same 15-minute window, only for that exact path, and only once the file is really in storage.

**On submit** the browser saves the request first, then uploads the three photos, then attaches each one that uploaded. A photo failure never fails the request. The confirmation shows the request number and says I may ask for photos again. Estimates are stored exactly as the customer saw them, and nothing recomputes them later.

## Notes on what's in the code vs. the SEO spec

- **Email** is omitted from JSON-LD and `humans.txt` by your earlier instruction — add back into `LocalBusiness` in `src/pages/index.astro` when you have one.
- **Phone** is set to `+1-970-275-7962` in `src/config/site.ts` (`seo.telephoneE164`).
- **Logo / OG image** URLs in JSON-LD point at `/logo.png` and `/og-image.jpg` — these 404 until you upload the files (step 1 above).
