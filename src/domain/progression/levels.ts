import titles from "@/content/level-titles.json";

/**
 * Total XP needed to *reach* `level` (level 1 starts at 0 XP).
 *
 * A gentle power curve: an engaged reader (~100 XP/day) reaches level 5 in a
 * few days, level 10 in about two weeks and level 50 in roughly half a year.
 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(50 * Math.pow(level - 1, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface LevelProgress {
  level: number;
  title: string;
  rank: Rank;
  /** XP earned inside the current level. */
  current: number;
  /** XP span of the current level. */
  needed: number;
  /** 0..1 */
  ratio: number;
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const needed = xpForLevel(level + 1) - floor;
  const current = xp - floor;
  return { level, title: levelTitle(level), rank: rankForLevel(level), current, needed, ratio: current / needed };
}

export function levelTitle(level: number): string {
  if (level > titles.length) return "Patriarca Lendário";
  return titles[Math.max(1, level) - 1];
}

export interface Rank {
  id: string;
  name: string;
  minLevel: number;
}

/** Coarse tiers shown as the player's "rank" next to the playful per-level title. */
export const RANKS: readonly Rank[] = [
  { id: "peregrino", name: "Peregrino", minLevel: 1 },
  { id: "discipulo", name: "Discípulo", minLevel: 5 },
  { id: "escriba", name: "Escriba", minLevel: 10 },
  { id: "levita", name: "Levita", minLevel: 15 },
  { id: "profeta", name: "Profeta", minLevel: 20 },
  { id: "juiz", name: "Juiz", minLevel: 25 },
  { id: "apostolo", name: "Apóstolo", minLevel: 30 },
  { id: "anciao", name: "Ancião", minLevel: 40 },
  { id: "patriarca", name: "Patriarca", minLevel: 50 },
];

export function rankForLevel(level: number): Rank {
  let rank = RANKS[0];
  for (const r of RANKS) if (level >= r.minLevel) rank = r;
  return rank;
}
