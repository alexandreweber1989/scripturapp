import { BOOKS, type BibleBook, isValidChapter, slugify } from "./books";

export interface ScriptureReference {
  book: BibleBook;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
}

/** Extra spellings people (and the AI) commonly use. Keys are slugified. */
const ALIASES: Record<string, string> = {
  salmo: "ps",
  sl: "ps",
  "cantico-dos-canticos": "ct",
  canticos: "ct",
  "cantares-de-salomao": "ct",
  oseias: "os",
  miqueias: "mq",
  "atos-dos-apostolos": "at",
  apocalipse: "ap",
};

const nameToBook = new Map<string, BibleBook>();
for (const book of BOOKS) nameToBook.set(slugify(book.name), book);
for (const [alias, id] of Object.entries(ALIASES)) {
  const book = BOOKS.find((b) => b.id === id);
  if (book) nameToBook.set(alias, book);
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Every accepted spelling, with and without accents, longest first so
// "1 João" wins over "João".
const spellings = new Set<string>();
for (const book of BOOKS) {
  spellings.add(book.name);
  spellings.add(book.name.normalize("NFD").replace(/[̀-ͯ]/g, ""));
}
for (const alias of Object.keys(ALIASES)) {
  if (alias.length > 2) spellings.add(alias.replace(/-/g, " "));
}
const alternation = [...spellings]
  .sort((a, b) => b.length - a.length)
  .map((s) => escapeRegExp(s).replace(/ /g, "\\s+"))
  .join("|");

const REFERENCE_SOURCE = `(?<![\\p{L}\\d])(${alternation})\\s+(\\d{1,3})(?:\\s*[:.]\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?)?(?![\\p{L}\\d])`;

function resolveBook(spelling: string): BibleBook | undefined {
  return nameToBook.get(slugify(spelling));
}

function build(match: RegExpExecArray): ScriptureReference | null {
  const book = resolveBook(match[1]);
  const chapter = Number(match[2]);
  if (!book || !isValidChapter(book, chapter)) return null;
  const verseStart = match[3] ? Number(match[3]) : undefined;
  const verseEnd = match[4] ? Number(match[4]) : undefined;
  if (verseStart !== undefined && verseStart < 1) return null;
  if (verseEnd !== undefined && verseStart !== undefined && verseEnd < verseStart) return null;
  return { book, chapter, verseStart, verseEnd };
}

/** Parses a single reference such as "João 3:16", "1 Coríntios 13:4-7" or "Salmos 23". */
export function parseReference(input: string): ScriptureReference | null {
  const re = new RegExp(`^\\s*${REFERENCE_SOURCE}\\s*$`, "iu");
  const match = re.exec(input);
  return match ? build(match) : null;
}

export interface ReferenceMatch {
  index: number;
  text: string;
  reference: ScriptureReference;
}

/** Finds every scripture reference inside free text (used to link the mentor's answers). */
export function findReferences(text: string): ReferenceMatch[] {
  const re = new RegExp(REFERENCE_SOURCE, "giu");
  const out: ReferenceMatch[] = [];
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const reference = build(m);
    if (reference) out.push({ index: m.index, text: m[0], reference });
  }
  return out;
}

export function formatScriptureReference(ref: ScriptureReference): string {
  let out = `${ref.book.name} ${ref.chapter}`;
  if (ref.verseStart) out += `:${ref.verseStart}`;
  if (ref.verseEnd && ref.verseEnd !== ref.verseStart) out += `-${ref.verseEnd}`;
  return out;
}
