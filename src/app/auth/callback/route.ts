import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";

/** Landing point for e-mail confirmation and magic links. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  // Only allow same-site relative redirects.
  const destination = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const supabase = await getServerSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }
  return NextResponse.redirect(new URL("/entrar?erro=link", url.origin));
}
