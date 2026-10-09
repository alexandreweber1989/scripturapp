import type { QuizAnswer } from "./quiz";

/** A comprehension question about one chapter, grounded in a specific verse. */
export interface ChapterQuestion {
  id: string;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
  verse: number;
}

export const CHAPTER_QUIZ_XP_PER_CORRECT = 5;
export const CHAPTER_QUIZ_PERFECT_BONUS = 5;
/** Correct answers needed for a trail step to count as passed. */
export const CHAPTER_QUIZ_PASS = 2;

export interface ChapterQuizScore {
  correct: number;
  total: number;
}

export class InvalidChapterQuizSubmission extends Error {}

/** Scores a chapter quiz from raw answers; every question must be answered exactly once. */
export function scoreChapterQuiz(questions: ChapterQuestion[], answers: QuizAnswer[]): ChapterQuizScore {
  if (answers.length !== questions.length) throw new InvalidChapterQuizSubmission("Responda todas as perguntas.");
  const byId = new Map(questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  let correct = 0;
  for (const { questionId, choice } of answers) {
    const question = byId.get(questionId);
    if (!question || seen.has(questionId)) throw new InvalidChapterQuizSubmission("Pergunta inválida.");
    seen.add(questionId);
    if (choice === question.answer) correct++;
  }
  return { correct, total: questions.length };
}
