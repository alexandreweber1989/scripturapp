import { hashString, seededRandom, shuffle } from "../random";

export type Difficulty = "easy" | "medium" | "hard";

export interface QuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** Index of the correct option. */
  answer: number;
  difficulty: Difficulty;
  category: string;
  explanation: string | null;
  reference: string | null;
}

export interface QuizPack {
  id: string;
  title: string;
  description: string;
  /** Visual/interaction variant of the quiz engine. */
  variant: "multiple-choice" | "true-false";
  questionsPerRound: number;
  /** Seconds per question; `null` = untimed. */
  secondsPerQuestion: number | null;
  questions: QuizQuestion[];
}

export const XP_PER_CORRECT: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 5 };
export const PERFECT_BONUS = 10;

export interface QuizAnswer {
  questionId: string;
  /** Chosen option index, or -1 when time ran out. */
  choice: number;
}

export interface QuizScore {
  packId: string;
  correct: number;
  total: number;
  perfect: boolean;
  xp: number;
}

/**
 * Picks the questions of a round. Deterministic for a given seed, so the
 * server can re-derive which questions a session was allowed to answer.
 */
export function pickRound(pack: QuizPack, seed: string, difficulty?: Difficulty): QuizQuestion[] {
  const pool = difficulty ? pack.questions.filter((q) => q.difficulty === difficulty) : pack.questions;
  const random = seededRandom(hashString(`${pack.id}:${seed}:${difficulty ?? "all"}`));
  return shuffle(pool, random).slice(0, pack.questionsPerRound);
}

export class InvalidQuizSubmission extends Error {}

/** Scores a round from the raw answers. Runs on the server: never trust a client-side score. */
export function scoreRound(pack: QuizPack, answers: QuizAnswer[]): QuizScore {
  if (answers.length === 0 || answers.length > pack.questionsPerRound) {
    throw new InvalidQuizSubmission("Número de respostas inválido.");
  }
  const byId = new Map(pack.questions.map((q) => [q.id, q]));
  const seen = new Set<string>();
  let correct = 0;
  let xp = 0;
  for (const { questionId, choice } of answers) {
    const question = byId.get(questionId);
    if (!question || seen.has(questionId)) throw new InvalidQuizSubmission("Pergunta inválida.");
    seen.add(questionId);
    if (choice === question.answer) {
      correct++;
      xp += XP_PER_CORRECT[question.difficulty];
    }
  }
  const total = answers.length;
  const perfect = correct === total && total >= 5;
  if (perfect) xp += PERFECT_BONUS;
  return { packId: pack.id, correct, total, perfect, xp };
}
