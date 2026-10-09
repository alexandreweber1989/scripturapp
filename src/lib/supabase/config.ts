/**
 * Supabase is optional in development: without it the app runs in guest mode,
 * keeping progress in the browser. In production, configure all three values.
 */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);
