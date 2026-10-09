import { NextResponse } from "next/server";
import { parseVerseKey } from "@/domain/bible/books";
import { getChapterVerses } from "@/lib/server/bible";

const MAX_KEYS = 100;

/** Text of up to 100 verses by key: `/api/versiculos?k=jo.3.16,ps.23.1`. Public, static content. */
export async function GET(request: Request) {
  const keys = (new URL(request.url).searchParams.get("k") ?? "").split(",").filter(Boolean).slice(0, MAX_KEYS);
  const verses: Record<string, string> = {};
  for (const key of keys) {
    const ref = parseVerseKey(key);
    if (!ref) continue;
    const text = (await getChapterVerses(ref.book.id, ref.chapter))?.[ref.verse - 1];
    if (text) verses[key] = text;
  }
  return NextResponse.json({ verses }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
