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
  integrations: [
    sitemap({
      changefreq: 'weekly',
      priority: 0.8,
      filter: (page) => !page.includes('/admin/') && !page.includes('/404'),
    }),
  ],
});
