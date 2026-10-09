import rawTrails from "@/content/trails.json";
import { getBook, parseVerseKey } from "./bible/books";
import { CHAPTER_QUIZ_PASS } from "./games/chapter-quiz";
import type { ProgressState } from "./progression/state";

export type TrailTone = "primary" | "gold" | "accent";

export interface Trail {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  tone: TrailTone;
  /** Chapter keys (`gn.1`) in order. */
  steps: string[];
  /** Collectible earned by mastering the trail. */
  relic: string;
}

export const TRAILS = rawTrails as Trail[];

export const TRAIL_COMPLETE_BONUS = 50;
export const TRAIL_MASTERY_BONUS = 100;
/** Share of the final challenge needed to master a trail. */
export const MASTERY_RATIO = 0.7;
export const BOSS_PACK_PREFIX = "trilha-";

export function getTrail(id: string): Trail | undefined {
  return TRAILS.find((t) => t.id === id);
}

export function bossPackId(trail: Trail): string {
  return `${BOSS_PACK_PREFIX}${trail.id}`;
}

export function trailFromBossPack(packId: string): Trail | undefined {
  return packId.startsWith(BOSS_PACK_PREFIX) ? getTrail(packId.slice(BOSS_PACK_PREFIX.length)) : undefined;
}

export function stepLabel(key: string): string {
  const [bookId, chapter] = key.split(".");
  const book = getBook(bookId);
  return book ? `${book.name} ${chapter}` : key;
}

/** Route to read a step's chapter (the reader shows the chapter quiz after reading). */
export function stepHref(key: string, trailId: string): string {
  const [bookId, chapter] = key.split(".");
  const book = getBook(bookId)!;
  return `/biblia/${book.slug}/${chapter}?trilha=${trailId}`;
}

export function isStepPassed(state: ProgressState, key: string): boolean {
  return (state.chapterQuizzes[key] ?? 0) >= CHAPTER_QUIZ_PASS;
}

export interface TrailProgress {
  passed: number;
  total: number;
  /** Index of the first step not yet passed, or -1 when all are. */
  current: number;
  completed: boolean;
  mastered: boolean;
  /** 0-3: 1 for completing, 2 when most steps are perfect, 3 when mastered with every step perfect. */
  stars: number;
}

export function trailProgress(trail: Trail, state: ProgressState): TrailProgress {
  const passed = trail.steps.filter((k) => isStepPassed(state, k)).length;
  const current = trail.steps.findIndex((k) => !isStepPassed(state, k));
  const completed = passed === trail.steps.length;
  const mastered = state.trailsMastered.includes(trail.id);
  const perfect = trail.steps.filter((k) => (state.chapterQuizzes[k] ?? 0) >= 3).length / trail.steps.length;
  const stars = !completed ? 0 : mastered && perfect === 1 ? 3 : perfect >= 0.75 || mastered ? 2 : 1;
  return { passed, total: trail.steps.length, current, completed, mastered, stars };
}

/** Trails that a just-passed chapter finished (used by the engine to pay the completion bonus). */
export function trailsCompletedBy(state: ProgressState, key: string): Trail[] {
  return TRAILS.filter((t) => t.steps.includes(key) && t.steps.every((k) => isStepPassed(state, k)));
}

export function isTrailStepKey(key: string): boolean {
  const [bookId, chapter] = key.split(".");
  return parseVerseKey(`${bookId}.${chapter}.1`) !== null;
}
