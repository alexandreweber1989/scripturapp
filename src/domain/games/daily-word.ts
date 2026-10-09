import { hashString, seededRandom, shuffle } from "../random";
import { daysBetween } from "../time";

export interface DailyWord {
  /** Uppercase, accent-free, 5 letters. */
  word: string;
  hint: string;
  clue: string;
  reference: string;
}

export const WORD_LENGTH = 5;
export const MAX_GUESSES = 6;

export type LetterState = "hit" | "near" | "miss";

/** Uppercases and strips accents, so "Graça" can be typed as GRACA. */
export function normalizeGuess(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

/**
 * The word of the day, identical for everyone. Walks a seeded shuffle of the
 * list so a word only repeats after the whole list has been used.
 */
export function wordForDay(day: string, words: readonly DailyWord[]): DailyWord {
  const index = daysBetween("2026-01-01", day);
  const cycle = Math.floor(index / words.length);
  const order = shuffle(words, seededRandom(hashString(`palavra:${cycle}`)));
  return order[((index % words.length) + words.length) % words.length];
}

/** Wordle-style feedback, handling repeated letters correctly. */
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const result: LetterState[] = Array(guess.length).fill("miss");
  const remaining = new Map<string, number>();
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) result[i] = "hit";
    else remaining.set(answer[i], (remaining.get(answer[i]) ?? 0) + 1);
  }
  for (let i = 0; i < guess.length; i++) {
    if (result[i] === "hit") continue;
    const left = remaining.get(guess[i]) ?? 0;
    if (left > 0) {
      result[i] = "near";
      remaining.set(guess[i], left - 1);
    }
  }
  return result;
}

export interface DailyWordResult {
  day: string;
  solved: boolean;
  attempts: number;
}

export class InvalidDailyWordSubmission extends Error {}

/** Validates a finished game against the real answer (runs on the server). */
export function scoreDailyWord(day: string, guesses: string[], answer: string): DailyWordResult {
  if (guesses.length === 0 || guesses.length > MAX_GUESSES) throw new InvalidDailyWordSubmission("Número de tentativas inválido.");
  for (const guess of guesses) {
    if (!/^[A-Z]{5}$/.test(guess)) throw new InvalidDailyWordSubmission("Palavra inválida.");
  }
  const solvedAt = guesses.indexOf(answer);
  if (solvedAt !== -1 && solvedAt !== guesses.length - 1) throw new InvalidDailyWordSubmission("Jogo já terminado.");
  const solved = solvedAt !== -1;
  if (!solved && guesses.length < MAX_GUESSES) throw new InvalidDailyWordSubmission("Jogo ainda não terminou.");
  return { day, solved, attempts: guesses.length };
}

/** XP: 30 when solved on the first try, 4 less per extra attempt; a small consolation when not solved. */
export function dailyWordXp(result: DailyWordResult): number {
  return result.solved ? 30 - 4 * (result.attempts - 1) : 3;
}

const EMOJI: Record<LetterState, string> = { hit: "🟩", near: "🟨", miss: "⬛" };

/** Shareable result grid (no letters, so it doesn't spoil the answer). */
export function shareText(day: string, guesses: string[], answer: string, solved: boolean): string {
  const [y, m, d] = day.split("-");
  const rows = guesses.map((g) => evaluateGuess(g, answer).map((s) => EMOJI[s]).join(""));
  return [`Palavra do Dia · Scriptura ${d}/${m}/${y}`, `${solved ? guesses.length : "X"}/${MAX_GUESSES}`, "", ...rows].join("\n");
}
