import "server-only";
import { getServerSupabase } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

/** Data access layer entry point: the verified user of this request, or null. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getServerSupabase();
  if (!supabase) return null;
  // getUser() validates the JWT with Supabase Auth (getSession() would trust the cookie blindly).
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}
