import "server-only";
import { cacheLife } from "next/cache";

export const TRANSLATION = { id: "nvi", name: "Nova Versão Internacional", short: "NVI" } as const;

interface BookFile {
  abbrev: string;
  name: string;
  chapters: string[][];
}

/** Verses of a chapter (1-based chapter). Static content, cached for the life of the deployment. */
export async function getChapterVerses(bookId: string, chapter: number): Promise<string[] | null> {
  "use cache";
  cacheLife("max");
  const file = (await import(`@/content/bible/nvi/${bookId}.json`)).default as BookFile;
  return file.chapters[chapter - 1] ?? null;
}
