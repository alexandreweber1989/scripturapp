import rawBooks from "@/content/bible-books.json";

export type Testament = "old" | "new";

export interface BibleBook {
  /** Stable short id used in storage keys and content files (e.g. `gn`, `1co`). */
  id: string;
  /** URL segment (e.g. `genesis`, `1-corintios`). */
  slug: string;
  name: string;
  chapters: number;
  testament: Testament;
  category: string;
  author: string;
  date: string;
  theme: string;
  /** 0-based canonical order. */
  order: number;
}

export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export const BOOKS: readonly BibleBook[] = rawBooks.map((b, order) => ({
  id: b.abbrev,
  slug: slugify(b.name),
  name: b.name,
  chapters: b.chapters,
  testament: b.testament as Testament,
  category: b.category,
  author: b.author,
  date: b.date,
  theme: b.theme,
  order,
}));

const byId = new Map(BOOKS.map((b) => [b.id, b]));
const bySlug = new Map(BOOKS.map((b) => [b.slug, b]));

export const TOTAL_CHAPTERS = BOOKS.reduce((sum, b) => sum + b.chapters, 0);

export function getBook(id: string): BibleBook | undefined {
  return byId.get(id);
}

export function getBookBySlug(slug: string): BibleBook | undefined {
  return bySlug.get(slug);
}

export interface ChapterRef {
  book: BibleBook;
  chapter: number;
}

export function isValidChapter(book: BibleBook, chapter: number): boolean {
  return Number.isInteger(chapter) && chapter >= 1 && chapter <= book.chapters;
}

export function nextChapter({ book, chapter }: ChapterRef): ChapterRef | null {
  if (chapter < book.chapters) return { book, chapter: chapter + 1 };
  const next = BOOKS[book.order + 1];
  return next ? { book: next, chapter: 1 } : null;
}

export function previousChapter({ book, chapter }: ChapterRef): ChapterRef | null {
  if (chapter > 1) return { book, chapter: chapter - 1 };
  const prev = BOOKS[book.order - 1];
  return prev ? { book: prev, chapter: prev.chapters } : null;
}

export function chapterHref(book: BibleBook, chapter: number): string {
  return `/biblia/${book.slug}/${chapter}`;
}

/** Storage key for a chapter: `gn.1`. */
export function chapterKey(bookId: string, chapter: number): string {
  return `${bookId}.${chapter}`;
}

/** Storage key for a verse: `gn.1.1`. */
export function verseKey(bookId: string, chapter: number, verse: number): string {
  return `${bookId}.${chapter}.${verse}`;
}

export function parseVerseKey(key: string): { book: BibleBook; chapter: number; verse: number } | null {
  const [id, ch, v] = key.split(".");
  const book = getBook(id);
  const chapter = Number(ch);
  const verse = Number(v);
  if (!book || !isValidChapter(book, chapter) || !Number.isInteger(verse) || verse < 1) return null;
  return { book, chapter, verse };
}

export function formatReference(book: BibleBook, chapter: number, verse?: number): string {
  return verse ? `${book.name} ${chapter}:${verse}` : `${book.name} ${chapter}`;
}
