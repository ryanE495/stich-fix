/**
 * BUILD-TIME ONLY. Resolves the Supabase URL and anon key that the browser
 * uses to submit mail-in repair requests.
 *
 * The anon key is public by design: it's rendered into the request form page.
 * Customer data is protected by RLS (anon has no table access at all) and by
 * the security definer RPCs in supabase/migrations/…_repair_requests.sql.
 *
 * This refuses to hand a SERVICE ROLE key to the browser — if one is ever put
 * in these variables by mistake, the build fails instead of leaking it.
 * The service role key is never read anywhere in this codebase.
 *
 * Reads the same variables the portfolio build already uses (SUPABASE_URL /
 * SUPABASE_ANON_KEY, or their VITE_ equivalents), so no new Netlify env vars
 * are needed.
 */

export interface PublicSupabaseConfig {
  url: string;
  anonKey: string;
}

export function getPublicSupabaseConfig(): PublicSupabaseConfig | null {
  const env = import.meta.env;
  const url: string | undefined = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey: string | undefined = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.warn('[mail-in] SUPABASE_URL / SUPABASE_ANON_KEY not set — the request form will show a call-or-text fallback on submit.');
    return null;
  }
  assertAnonKey(anonKey);
  return { url, anonKey };
}

/** Throws (failing the build) unless the key is an anon / publishable key. */
export function assertAnonKey(key: string): void {
  if (key.startsWith('sb_secret_')) {
    throw new Error('[mail-in] SUPABASE_ANON_KEY holds a secret (service) key. Refusing to put it in the browser. Use the anon/publishable key.');
  }
  if (key.startsWith('sb_publishable_')) return;

  // Legacy keys are JWTs; the role claim says which kind it is.
  const parts = key.split('.');
  if (parts.length !== 3) {
    throw new Error('[mail-in] SUPABASE_ANON_KEY is not a recognizable Supabase anon key.');
  }
  let role: unknown;
  try {
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    role = JSON.parse(atob(b64)).role;
  } catch {
    throw new Error('[mail-in] SUPABASE_ANON_KEY could not be decoded.');
  }
  if (role !== 'anon') {
    throw new Error(`[mail-in] SUPABASE_ANON_KEY has role "${String(role)}", not "anon". Refusing to put it in the browser.`);
  }
}
