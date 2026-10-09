import { hashString, seededRandom } from "../random";
import { daysBetween } from "../time";

/**
 * Spaced repetition for memorizing verses (a simplified SM-2): verses you
 * remember come back less often, verses you forget come back tomorrow.
 */
export interface ReviewState {
  /** Next review day, `YYYY-MM-DD`. */
  due: string;
  /** Days until the next review after the last one. */
  interval: number;
  ease: number;
  reps: number;
}

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export const GRADES: { grade: ReviewGrade; label: string }[] = [
  { grade: "again", label: "Esqueci" },
  { grade: "hard", label: "Difícil" },
  { grade: "good", label: "Lembrei" },
  { grade: "easy", label: "Fácil" },
];

const MIN_EASE = 1.3;
/** A verse reviewed at an interval of at least this many days counts as memorized. */
export const MEMORIZED_INTERVAL = 21;

function addDays(day: string, days: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function newReview(today: string): ReviewState {
  return { due: today, interval: 0, ease: 2.5, reps: 0 };
}

export function gradeReview(state: ReviewState, grade: ReviewGrade, today: string): ReviewState {
  if (grade === "again") {
    return { due: addDays(today, 1), interval: 1, ease: Math.max(MIN_EASE, state.ease - 0.2), reps: 0 };
  }
  const ease = Math.max(MIN_EASE, state.ease + (grade === "hard" ? -0.15 : grade === "easy" ? 0.15 : 0));
  let interval: number;
  if (state.reps === 0) interval = grade === "easy" ? 4 : grade === "hard" ? 1 : 2;
  else if (state.reps === 1) interval = grade === "easy" ? 8 : grade === "hard" ? 3 : 6;
  else interval = Math.round(state.interval * (grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease));
  interval = Math.max(1, interval);
  return { due: addDays(today, interval), interval, ease, reps: state.reps + 1 };
}

export function isDue(state: ReviewState | undefined, today: string): boolean {
  return !state || daysBetween(state.due, today) >= 0;
}

export function isMemorized(state: ReviewState | undefined): boolean {
  return !!state && state.interval >= MEMORIZED_INTERVAL;
}

export interface ClozeToken {
  text: string;
  hidden: boolean;
}

/**
 * Hides about a third of the meaningful words of a verse (deterministic per
 * verse and repetition, so a refresh shows the same blanks).
 */
export function clozeVerse(text: string, seed: string): ClozeToken[] {
  const random = seededRandom(hashString(seed));
  const parts = text.split(/(\s+)/);
  const tokens = parts.map((part) => {
    const word = part.replace(/[^\p{L}]/gu, "");
    return { text: part, hidden: word.length >= 4 && random() < 0.38 };
  });
  if (!tokens.some((t) => t.hidden)) {
    const longest = tokens.reduce((best, t, i) => (t.text.length > tokens[best].text.length ? i : best), 0);
    tokens[longest].hidden = true;
  }
  return tokens;
}
