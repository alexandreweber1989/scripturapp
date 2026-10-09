"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "./config";

let client: SupabaseClient | null = null;

/** Browser client, or `null` in guest-only mode. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createBrowserClient(supabaseUrl, supabasePublishableKey);
  return client;
}
