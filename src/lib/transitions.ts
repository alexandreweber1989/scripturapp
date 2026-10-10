import { getBookBySlug } from "@/domain/bible/books";

/**
 * View transition types attached to navigations (see `PageTransition` and the
 * `::view-transition-*` rules in globals.css). Each one tells the user how they moved:
 * - `tab-next` / `tab-prev`: switched to the main-menu section to the right / left,
 *   or turned to the next / previous Bible chapter;
 * - `nav-forward` / `nav-back`: went deeper into a section (list → detail) / came back up.
 */
export type NavigationType = "tab-next" | "tab-prev" | "nav-forward" | "nav-back";

/** Main-menu order, left to right. Pages outside the menu sit next to their closest section. */
const SECTION_ORDER: Record<string, number> = {
  "": 0,
  biblia: 1,
  trilhas: 2,
  jogos: 3,
  memorizar: 3,
  mentor: 4,
  perfil: 5,
  entrar: 5,
};

function segments(path: string): string[] {
  return path.split(/[?#]/)[0].split("/").filter(Boolean);
}

/** Canonical position of a `/biblia/<book>/<chapter>` page, or null for other pages. */
function chapterPosition(parts: string[]): number | null {
  if (parts[0] !== "biblia" || parts.length !== 3) return null;
  const book = getBookBySlug(parts[1]);
  const chapter = Number(parts[2]);
  return book && Number.isInteger(chapter) ? book.order * 1000 + chapter : null;
}

export function navigationTypes(from: string, to: string): NavigationType[] {
  // External links and same-page links (query or hash changes) get no animation.
  if (!to.startsWith("/")) return [];
  const a = segments(from);
  const b = segments(to);
  if (a.join("/") === b.join("/")) return [];

  const sectionA = SECTION_ORDER[a[0] ?? ""];
  const sectionB = SECTION_ORDER[b[0] ?? ""];
  if (sectionA === undefined || sectionB === undefined) return [];

  if ((a[0] ?? "") !== (b[0] ?? "")) {
    // Opening a detail page of another section (e.g. a trail step from the home screen) drills in.
    if (b.length > 1) return ["nav-forward"];
    if (sectionA === sectionB) return [b.length < a.length ? "nav-back" : "nav-forward"];
    return [sectionB > sectionA ? "tab-next" : "tab-prev"];
  }

  if (b.length !== a.length) return [b.length > a.length ? "nav-forward" : "nav-back"];

  const chapterA = chapterPosition(a);
  const chapterB = chapterPosition(b);
  if (chapterA !== null && chapterB !== null) return [chapterB > chapterA ? "tab-next" : "tab-prev"];
  return ["nav-forward"];
}
