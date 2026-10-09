import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

/** Keeps the Supabase session cookie fresh. Authorization itself happens in route handlers (data access layer). */
export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (toSet) => {
        for (const { name, value } of toSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|companions/|.*\\.(?:png|jpg|svg|webp|json)$).*)"],
};
