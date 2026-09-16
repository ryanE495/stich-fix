import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://westernslopestitchworks.com',
  output: 'static',
  build: {
    format: 'directory',
  },
  trailingSlash: 'ignore',
  image: {
    // Allow Astro's <Image> component to fetch + resize the portfolio images
    // hosted on Supabase Storage at build time. Without this, remote sources
    // throw "src must be a known remote image".
    domains: ['bswmrfxdadcmuyhmsagv.supabase.co'],
  },
  vite: {
    optimizeDeps: {
      // supabase-js is pulled in by a dynamic import on first submit
      // (src/lib/mail-in/submit.ts), so Vite doesn't see it when it scans
      // entry points and pre-bundles it mid-session instead. That leaves the
      // already-loaded page pointing at a stale chunk, which 504s as
      // "Outdated Optimize Dep" and surfaces in the form as a network error.
      // Pre-bundling it up front avoids the whole cycle. Dev-only concern —
      // production builds don't use the optimizer.
      include: ['@supabase/supabase-js'],
    },
  },
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      // Transactional pages stay out of the sitemap (they're also noindex).
      filter: (page) =>
        !page.includes('/admin/') && !page.includes('/404') && !page.includes('/mail-in-repair/start'),
    }),
  ],
});
