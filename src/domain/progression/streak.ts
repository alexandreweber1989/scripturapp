import { daysBetween } from "../time";

export const MAX_SHIELDS = 2;
/** A shield ("Escudo da Fé") is earned every time the streak reaches a multiple of this. */
export const SHIELD_EVERY = 7;

export interface StreakState {
  current: number;
  longest: number;
  lastActiveDay: string | null;
  /** Each shield forgives one missed day. */
  shields: number;
}

export const EMPTY_STREAK: StreakState = { current: 0, longest: 0, lastActiveDay: null, shields: 0 };

export interface StreakUpdate {
  streak: StreakState;
  /** True when this activity extended (or started) the streak today. */
  advanced: boolean;
  shieldsUsed: number;
  shieldEarned: boolean;
}

/** Registers activity on `today`. Idempotent within the same day. */
export function registerActivity(state: StreakState, today: string): StreakUpdate {
  if (state.lastActiveDay === today) {
    return { streak: state, advanced: false, shieldsUsed: 0, shieldEarned: false };
  }

  let current = 1;
  let shields = state.shields;
  let shieldsUsed = 0;

  if (state.lastActiveDay) {
    const gap = daysBetween(state.lastActiveDay, today);
    if (gap <= 0) {
      // Clock went backwards (e.g. device time change): don't touch the streak.
      return { streak: state, advanced: false, shieldsUsed: 0, shieldEarned: false };
    }
    const missed = gap - 1;
    if (missed === 0) {
      current = state.current + 1;
    } else if (missed <= shields) {
      shields -= missed;
      shieldsUsed = missed;
      current = state.current + 1;
    }
  }

  const shieldEarned = current % SHIELD_EVERY === 0 && shields < MAX_SHIELDS;
  if (shieldEarned) shields++;

  return {
    streak: { current, longest: Math.max(state.longest, current), lastActiveDay: today, shields },
    advanced: true,
    shieldsUsed,
    shieldEarned,
  };
}

/** The streak as it should be *displayed* today (0 if it is already lost). */
export function effectiveStreak(state: StreakState, today: string): number {
  if (!state.lastActiveDay) return 0;
  const missed = daysBetween(state.lastActiveDay, today) - 1;
  if (missed <= 0) return state.current;
  return missed <= state.shields ? state.current : 0;
}

/** True when the player has not been active today but can still keep the streak alive. */
export function streakAtRisk(state: StreakState, today: string): boolean {
  return state.lastActiveDay !== today && effectiveStreak(state, today) > 0;
}
