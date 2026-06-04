/**
 * Portfolio data layer.
 *
 * Reads PUBLISHED items from the shared Supabase project at build time
 * (anon key — RLS restricts to status = 'published'). All fetchers fail
 * soft: if env vars are missing or the request errors, they return an
 * empty array so the Astro build keeps going and the /portfolio page
 * falls back to the "coming soon" empty state.
 *
 * Env vars (build-time only; do NOT expose to the client bundle):
 *   SUPABASE_URL            — e.g. https://xxx.supabase.co
 *   SUPABASE_ANON_KEY       — public anon key, restricted by RLS
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  materials_techniques: string[] | null;
  approach: string | null;
  challenge: string | null;
  detail_1_label: string | null;
  detail_1_value: string | null;
  detail_2_label: string | null;
  detail_2_value: string | null;
  detail_3_label: string | null;
  detail_3_value: string | null;
  before_image_url: string | null;
  after_image_url: string | null;
  display_order: number | null;
  status: 'published' | 'draft' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface PortfolioItemWithSlug extends PortfolioItem {
  slug: string;
}

// Accept either prefix so the same lib reads from a typical Astro/Vite-style
// `.env` (VITE_*) or a server-only env-var setup (no prefix). Whichever
// convention is set at build/dev time wins.
const SUPABASE_URL =
  import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
function getClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}

/** Slugify a title to a URL fragment. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['"]+/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Build deterministic, collision-safe slugs for a list of items. When two
 * titles slugify to the same string, the second one onward gets a short
 * id-fragment suffix so URLs stay unique.
 */
export function withSlugs(items: PortfolioItem[]): PortfolioItemWithSlug[] {
  const counts = new Map<string, number>();
  return items.map((item) => {
    const base = slugify(item.title) || 'item';
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    const slug = seen === 0 ? base : `${base}-${item.id.replace(/-/g, '').slice(0, 8)}`;
    return { ...item, slug };
  });
}

/**
 * Fetch published portfolio items ordered for the archive page.
 * Returns [] on any failure (missing env vars, network error, RLS rejection).
 */
export async function fetchPublishedPortfolio(): Promise<PortfolioItem[]> {
  const supabase = getClient();
  if (!supabase) {
    console.warn(
      '[portfolio] SUPABASE_URL / SUPABASE_ANON_KEY not set — skipping portfolio fetch.'
    );
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('stitchworks_portfolio_items')
      .select('*')
      .eq('status', 'published')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('[portfolio] Supabase error:', error.message);
      return [];
    }
    return (data ?? []) as PortfolioItem[];
  } catch (e) {
    console.warn('[portfolio] Unexpected fetch error:', (e as Error).message);
    return [];
  }
}

/** Convenience: the N most recently published items (created_at desc). */
export async function fetchRecentPortfolio(limit = 3): Promise<PortfolioItem[]> {
  const supabase = getClient();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('stitchworks_portfolio_items')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.warn('[portfolio] Recent fetch error:', error.message);
      return [];
    }
    return (data ?? []) as PortfolioItem[];
  } catch (e) {
    console.warn('[portfolio] Unexpected recent fetch error:', (e as Error).message);
    return [];
  }
}

/** Pick the best thumbnail image (after > before). */
export function pickThumbnail(item: PortfolioItem): string | null {
  return item.after_image_url || item.before_image_url || null;
}

/**
 * Pure helper: given the full slugged list and a current item, return up to
 * `limit` "related" items for cross-linking. Same-category items come first
 * (preserving list order), then the most-recent others fill any remaining
 * slots so every entry always gets a related mesh even in a single-item
 * category. The current item is always excluded.
 */
export function getRelatedItems(
  all: PortfolioItemWithSlug[],
  current: PortfolioItemWithSlug,
  limit = 3
): PortfolioItemWithSlug[] {
  const others = all.filter((i) => i.slug !== current.slug);
  const sameCategory = others.filter((i) => i.category === current.category);
  const rest = others.filter((i) => i.category !== current.category);
  const seen = new Set<string>();
  const out: PortfolioItemWithSlug[] = [];
  for (const i of [...sameCategory, ...rest]) {
    if (seen.has(i.slug)) continue;
    seen.add(i.slug);
    out.push(i);
    if (out.length >= limit) break;
  }
  return out;
}
