import { describe, expect, it } from "vitest";
import { BOOKS, TOTAL_CHAPTERS, getBookBySlug, nextChapter, parseVerseKey, previousChapter } from "../bible/books";
import { findReferences, formatScriptureReference, parseReference } from "../bible/reference";

describe("bible catalog", () => {
  it("has the 66 canonical books and 1189 chapters", () => {
    expect(BOOKS).toHaveLength(66);
    expect(TOTAL_CHAPTERS).toBe(1189);
  });

  it("builds unique, accent-free slugs", () => {
    expect(new Set(BOOKS.map((b) => b.slug)).size).toBe(66);
    expect(getBookBySlug("genesis")?.name).toBe("Gênesis");
    expect(getBookBySlug("1-corintios")?.id).toBe("1co");
  });

  it("navigates across book boundaries", () => {
    const genesis = getBookBySlug("genesis")!;
    expect(nextChapter({ book: genesis, chapter: 50 })).toMatchObject({ book: { slug: "exodo" }, chapter: 1 });
    expect(previousChapter({ book: genesis, chapter: 1 })).toBeNull();
    const malaquias = getBookBySlug("malaquias")!;
    expect(nextChapter({ book: malaquias, chapter: 4 })?.book.slug).toBe("mateus");
  });

  it("parses verse keys", () => {
    expect(parseVerseKey("jo.3.16")).toMatchObject({ book: { name: "João" }, chapter: 3, verse: 16 });
    expect(parseVerseKey("jo.99.1")).toBeNull();
    expect(parseVerseKey("xx.1.1")).toBeNull();
  });
});

describe("scripture references", () => {
  it("parses common forms", () => {
    expect(formatScriptureReference(parseReference("João 3:16")!)).toBe("João 3:16");
    expect(formatScriptureReference(parseReference("1 Coríntios 13:4-7")!)).toBe("1 Coríntios 13:4-7");
    expect(formatScriptureReference(parseReference("Salmos 23")!)).toBe("Salmos 23");
    expect(parseReference("Salmo 23:1")?.book.id).toBe("ps");
    expect(parseReference("Genesis 1:1")?.book.id).toBe("gn");
  });

  it("distinguishes João, 1 João and Jó", () => {
    expect(parseReference("1 João 4:8")?.book.id).toBe("1jo");
    expect(parseReference("João 4:8")?.book.id).toBe("jo");
    expect(parseReference("Jó 1:21")?.book.id).toBe("job");
  });

  it("rejects chapters that do not exist", () => {
    expect(parseReference("Judas 2:1")).toBeNull();
    expect(parseReference("Romanos 3:10-2")).toBeNull();
  });

  it("finds references inside free text", () => {
    const text = "Leia João 3:16 e também Romanos 8:28-30; compare com 1 João 4:8.";
    expect(findReferences(text).map((m) => m.text)).toEqual(["João 3:16", "Romanos 8:28-30", "1 João 4:8"]);
  });
});
