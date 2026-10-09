import type { ChapterQuestion } from "@/domain/games/chapter-quiz";
import davi from "./davi.json";
import marcos1 from "./marcos-1.json";
import marcos2 from "./marcos-2.json";
import primeirosPassos from "./primeiros-passos.json";

/**
 * Comprehension questions per chapter (`gn.1` → 3 questions). Drafted with AI
 * from the NVI text and kept as reviewed content, never generated on the fly.
 */
const QUIZZES: Record<string, ChapterQuestion[]> = { ...primeirosPassos, ...marcos1, ...marcos2, ...davi };

export function getChapterQuiz(chapterKey: string): ChapterQuestion[] | undefined {
  return QUIZZES[chapterKey];
}

export function chapterQuizKeys(): string[] {
  return Object.keys(QUIZZES);
}
