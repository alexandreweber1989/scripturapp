import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth-errors";
import { getServerSupabase } from "@/lib/supabase/server";

/** Landing point for e-mail confirmation and password-reset links. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // Only same-site relative redirects.
  const destination = safeNext(url.searchParams.get("next"));

  const supabase = await getServerSupabase();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(destination, url.origin));
  }
  // A failed password-reset link sends the user straight back to "request a new link".
  const retry = destination === "/redefinir-senha" ? "/entrar?erro=link&modo=recuperar" : "/entrar?erro=link";
  return NextResponse.redirect(new URL(retry, url.origin));
}
