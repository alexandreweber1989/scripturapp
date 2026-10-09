import { chapterKey } from "../bible/books";
import { CHAPTER_QUIZ_PERFECT_BONUS, CHAPTER_QUIZ_XP_PER_CORRECT } from "../games/chapter-quiz";
import { dailyWordXp } from "../games/daily-word";
import {
  MASTERY_RATIO,
  TRAIL_COMPLETE_BONUS,
  TRAIL_MASTERY_BONUS,
  type Trail,
  trailFromBossPack,
  trailProgress,
  trailsCompletedBy,
} from "../trails";
import {
  type Activity,
  type Counts,
  type Metric,
  CHAPTER_XP,
  DAILY_VERSE_XP,
  FAVORITE_XP,
  FIRST_READ_BONUS,
  HIGHLIGHT_XP,
  MENTOR_XP,
  NOTE_XP,
  REVIEW_XP,
  RULES,
  activityKey,
  isValidActivity,
} from "./activities";
import { ACHIEVEMENTS, type Achievement } from "./achievements";
import { levelFromXp } from "./levels";
import { FULL_DAY_BONUS, type QuestDefinition, questsForDay } from "./quests";
import { type ProgressState, rollDay } from "./state";
import { registerActivity } from "./streak";

export interface RewardLine {
  label: string;
  xp: number;
}

export interface Reward {
  xp: number;
  lines: RewardLine[];
  levelUp: { from: number; to: number } | null;
  questsCompleted: QuestDefinition[];
  fullDay: boolean;
  achievements: Achievement[];
  streak: { current: number; advanced: boolean; shieldEarned: boolean; shieldsUsed: number };
}

export type ApplyResult =
  | { ok: true; key: string; state: ProgressState; reward: Reward }
  | { ok: false; key: string; reason: "invalid" | "duplicate" };

export interface ApplyContext {
  day: string;
  /** Whether this idempotency key was already rewarded (checked against the ledger). */
  alreadyClaimed: (key: string) => boolean;
}

function bump(counts: Counts, metric: Metric, by = 1): Counts {
  return { ...counts, [metric]: (counts[metric] ?? 0) + by };
}

function baseReward(activity: Activity, state: ProgressState): { metrics: Metric[]; lines: RewardLine[] } {
  const label = RULES[activity.type].label;
  switch (activity.type) {
    case "chapter_read": {
      const lines = [{ label, xp: CHAPTER_XP }];
      if (!state.readChapters.includes(chapterKey(activity.book, activity.chapter))) {
        lines.push({ label: "Primeira leitura deste capítulo", xp: FIRST_READ_BONUS });
      }
      return { metrics: ["chapter_read"], lines };
    }
    case "quiz_completed": {
      const { score } = activity;
      const lines = [{ label: `${label} (${score.correct}/${score.total})`, xp: score.xp }];
      return { metrics: score.perfect ? ["quiz_completed", "quiz_perfect"] : ["quiz_completed"], lines };
    }
    case "verse_favorited":
      return { metrics: ["verse_favorited"], lines: [{ label, xp: FAVORITE_XP }] };
    case "verse_highlighted":
      return { metrics: ["verse_highlighted"], lines: [{ label, xp: HIGHLIGHT_XP }] };
    case "note_written":
      return { metrics: ["note_written"], lines: [{ label, xp: NOTE_XP }] };
    case "daily_verse_read":
      return { metrics: ["daily_verse_read"], lines: [{ label, xp: DAILY_VERSE_XP }] };
    case "mentor_question":
      return { metrics: ["mentor_question"], lines: [{ label, xp: MENTOR_XP }] };
    case "chapter_quiz_completed": {
      // Only improvements pay XP, so replaying a quiz can't be farmed.
      const key = chapterKey(activity.book, activity.chapter);
      const best = state.chapterQuizzes[key] ?? 0;
      const { correct, total } = activity.score;
      const lines = [{ label: `${label} (${correct}/${total})`, xp: Math.max(0, correct - best) * CHAPTER_QUIZ_XP_PER_CORRECT }];
      if (correct === total && best < total) lines.push({ label: "Gabarito no capítulo", xp: CHAPTER_QUIZ_PERFECT_BONUS });
      return { metrics: ["chapter_quiz_completed"], lines };
    }
    case "daily_word_completed": {
      const { result } = activity;
      const text = result.solved ? `${label} (${result.attempts}/6)` : `${label} (não foi dessa vez)`;
      return { metrics: result.solved ? ["daily_word_solved"] : [], lines: [{ label: text, xp: dailyWordXp(result) }] };
    }
    case "verse_reviewed":
      return { metrics: ["verse_reviewed"], lines: [{ label, xp: REVIEW_XP }] };
  }
}

/**
 * The single source of truth for gamification rules. Pure: the same function
 * runs in the browser (guest mode) and on the server (accounts), where its
 * result is persisted together with the idempotency key in one transaction.
 */
export function applyActivity(previous: ProgressState, activity: Activity, ctx: ApplyContext): ApplyResult {
  const key = activityKey(activity, ctx.day);
  if (!isValidActivity(activity)) return { ok: false, key, reason: "invalid" };
  if (activity.type === "daily_word_completed" && activity.result.day !== ctx.day) return { ok: false, key, reason: "invalid" };
  if (ctx.alreadyClaimed(key)) return { ok: false, key, reason: "duplicate" };

  let state = rollDay(previous, ctx.day);
  const levelBefore = levelFromXp(state.xp);
  const { metrics, lines: base } = baseReward(activity, state);

  // Daily cap: still counts for quests/stats, but stops paying XP.
  const rule = RULES[activity.type];
  const rewardedToday = state.today.rewarded[activity.type as Metric] ?? 0;
  const capped = rewardedToday >= rule.dailyCap;
  const lines: RewardLine[] = capped ? [{ label: `${rule.label} (limite diário de XP atingido)`, xp: 0 }] : base;

  let counts = state.today.counts;
  let totals = state.totals;
  for (const m of metrics) {
    counts = bump(counts, m);
    totals = bump(totals, m);
  }

  // Chapter quizzes: keep the best score, then pay trails that this step completed.
  let chapterQuizzes = state.chapterQuizzes;
  let completedTrails: Trail[] = [];
  if (activity.type === "chapter_quiz_completed") {
    const key = chapterKey(activity.book, activity.chapter);
    const before = trailsCompletedBy(state, key).map((t) => t.id);
    chapterQuizzes = { ...chapterQuizzes, [key]: Math.max(chapterQuizzes[key] ?? 0, activity.score.correct) };
    completedTrails = trailsCompletedBy({ ...state, chapterQuizzes }, key).filter((t) => !before.includes(t.id));
  }
  for (const trail of completedTrails) lines.push({ label: `Trilha concluída: ${trail.title}`, xp: TRAIL_COMPLETE_BONUS });

  // The final challenge of a completed trail masters it.
  let trailsMastered = state.trailsMastered;
  if (activity.type === "quiz_completed") {
    const trail = trailFromBossPack(activity.score.packId);
    const { correct, total } = activity.score;
    if (trail && !trailsMastered.includes(trail.id) && correct / total >= MASTERY_RATIO && trailProgress(trail, { ...state, chapterQuizzes }).completed) {
      trailsMastered = [...trailsMastered, trail.id];
      lines.push({ label: `Trilha dominada: ${trail.title} · relíquia ${trail.relic}`, xp: TRAIL_MASTERY_BONUS });
    }
  }

  const readChapters =
    activity.type === "chapter_read" && !state.readChapters.includes(chapterKey(activity.book, activity.chapter))
      ? [...state.readChapters, chapterKey(activity.book, activity.chapter)]
      : state.readChapters;

  const streakUpdate = registerActivity(state.streak, ctx.day);

  state = {
    ...state,
    streak: streakUpdate.streak,
    totals,
    readChapters,
    chapterQuizzes,
    trailsMastered,
    today: {
      ...state.today,
      counts,
      rewarded: capped ? state.today.rewarded : bump(state.today.rewarded, activity.type as Metric),
    },
  };

  // Quests of the day.
  const questsCompleted: QuestDefinition[] = [];
  const quests = questsForDay(ctx.day);
  for (const quest of quests) {
    if (!state.today.questsClaimed.includes(quest.id) && (counts[quest.metric] ?? 0) >= quest.target) {
      questsCompleted.push(quest);
      lines.push({ label: `Missão: ${quest.title}`, xp: quest.xp });
    }
  }
  const questsClaimed = [...state.today.questsClaimed, ...questsCompleted.map((q) => q.id)];
  const fullDay = !state.today.fullDayClaimed && quests.every((q) => questsClaimed.includes(q.id));
  if (fullDay) lines.push({ label: "Todas as missões do dia", xp: FULL_DAY_BONUS });

  const gained = lines.reduce((sum, l) => sum + l.xp, 0);
  state = {
    ...state,
    xp: state.xp + gained,
    today: { ...state.today, xp: state.today.xp + gained, questsClaimed, fullDayClaimed: state.today.fullDayClaimed || fullDay },
  };

  // Achievements can unlock each other (e.g. XP from one pushes a level), so loop until stable.
  const unlocked: Achievement[] = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (const achievement of ACHIEVEMENTS) {
      if (!state.achievements.includes(achievement.id) && achievement.isUnlocked(state)) {
        unlocked.push(achievement);
        changed = true;
        state = { ...state, xp: state.xp + achievement.xp, achievements: [...state.achievements, achievement.id] };
        if (achievement.xp > 0) {
          lines.push({ label: `Conquista: ${achievement.title}`, xp: achievement.xp });
          state = { ...state, today: { ...state.today, xp: state.today.xp + achievement.xp } };
        }
      }
    }
  }

  const levelAfter = levelFromXp(state.xp);
  return {
    ok: true,
    key,
    state,
    reward: {
      xp: lines.reduce((sum, l) => sum + l.xp, 0),
      lines,
      levelUp: levelAfter > levelBefore ? { from: levelBefore, to: levelAfter } : null,
      questsCompleted,
      fullDay,
      achievements: unlocked,
      streak: {
        current: state.streak.current,
        advanced: streakUpdate.advanced,
        shieldEarned: streakUpdate.shieldEarned,
        shieldsUsed: streakUpdate.shieldsUsed,
      },
    },
  };
}
