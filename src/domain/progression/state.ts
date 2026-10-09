import type { Counts } from "./activities";
import { EMPTY_STREAK, type StreakState } from "./streak";

export const PROGRESS_SCHEMA_VERSION = 1;

/** A player's whole gamification state. Stored as-is in localStorage (guest) or in `user_progress` (account). */
export interface ProgressState {
  schema: number;
  xp: number;
  streak: StreakState;
  today: {
    day: string;
    counts: Counts;
    /** Rewarded occurrences per activity type, for daily caps. */
    rewarded: Counts;
    xp: number;
    questsClaimed: string[];
    fullDayClaimed: boolean;
  };
  totals: Counts;
  /** Chapter keys (`gn.1`) read at least once. */
  readChapters: string[];
  /** Best score (correct answers) per chapter quiz, by chapter key. */
  chapterQuizzes: Record<string, number>;
  /** Trails whose final challenge was passed. */
  trailsMastered: string[];
  achievements: string[];
}

export function emptyToday(day: string): ProgressState["today"] {
  return { day, counts: {}, rewarded: {}, xp: 0, questsClaimed: [], fullDayClaimed: false };
}

export function createProgressState(day: string): ProgressState {
  return {
    schema: PROGRESS_SCHEMA_VERSION,
    xp: 0,
    streak: EMPTY_STREAK,
    today: emptyToday(day),
    totals: {},
    readChapters: [],
    chapterQuizzes: {},
    trailsMastered: [],
    achievements: [],
  };
}

/** Starts a fresh "today" when the day has changed. */
export function rollDay(state: ProgressState, day: string): ProgressState {
  return state.today.day === day ? state : { ...state, today: emptyToday(day) };
}

/** Defensive parse for state coming from storage. */
export function normalizeProgressState(raw: unknown, day: string): ProgressState {
  const base = createProgressState(day);
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<ProgressState>;
  return rollDay(
    {
      ...base,
      ...r,
      schema: PROGRESS_SCHEMA_VERSION,
      xp: typeof r.xp === "number" && r.xp >= 0 ? r.xp : 0,
      streak: { ...base.streak, ...r.streak },
      today: r.today ? { ...emptyToday(r.today.day ?? day), ...r.today } : base.today,
      totals: r.totals ?? {},
      readChapters: Array.isArray(r.readChapters) ? r.readChapters : [],
      chapterQuizzes: r.chapterQuizzes && typeof r.chapterQuizzes === "object" ? r.chapterQuizzes : {},
      trailsMastered: Array.isArray(r.trailsMastered) ? r.trailsMastered : [],
      achievements: Array.isArray(r.achievements) ? r.achievements : [],
    },
    day,
  );
}
