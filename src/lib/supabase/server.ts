import "server-only";
import { createServerClient } from "@supabase/ssr";
import { type SupabaseClient, createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";

/** Request-scoped client acting as the signed-in user (RLS applies). */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return null;
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;

/**
 * Service-role client. Bypasses RLS: only for the few server paths that write
 * gamification state (`commit_progress`) or consume the AI quota.
 */
export function getAdminSupabase(): SupabaseClient {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada.");
  admin ??= createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return admin;
}
