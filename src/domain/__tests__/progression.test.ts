import { describe, expect, it } from "vitest";
import { QUIZ_PACKS } from "@/content/games";
import { InvalidQuizSubmission, PERFECT_BONUS, pickRound, scoreRound } from "../games/quiz";
import type { Activity } from "../progression/activities";
import { applyActivity, type ApplyResult } from "../progression/engine";
import { levelFromXp, levelProgress, xpForLevel } from "../progression/levels";
import { questStatuses, questsForDay } from "../progression/quests";
import { type ProgressState, createProgressState } from "../progression/state";
import { type StreakState, effectiveStreak, registerActivity } from "../progression/streak";
import { dayKey, daysBetween } from "../time";

describe("time", () => {
  it("uses the platform time zone for day keys", () => {
    // 02:00 UTC is still the previous day in São Paulo (UTC-3).
    expect(dayKey(new Date("2026-03-10T02:00:00Z"))).toBe("2026-03-09");
    expect(daysBetween("2026-02-28", "2026-03-01")).toBe(1);
  });
});

describe("levels", () => {
  it("is monotonic and consistent", () => {
    for (let l = 1; l < 80; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });

  it("reports progress inside a level", () => {
    const p = levelProgress(xpForLevel(3) + 10);
    expect(p.level).toBe(3);
    expect(p.current).toBe(10);
    expect(p.title).toBe("Apanhador de Maná Profissional");
    expect(p.rank.name).toBe("Peregrino");
  });
});

describe("streak", () => {
  const empty: StreakState = { current: 0, longest: 0, lastActiveDay: null, shields: 0 };

  it("grows on consecutive days and is idempotent within a day", () => {
    let s = registerActivity(empty, "2026-01-01").streak;
    expect(registerActivity(s, "2026-01-01").advanced).toBe(false);
    s = registerActivity(s, "2026-01-02").streak;
    expect(s.current).toBe(2);
  });

  it("resets after a missed day without shields", () => {
    const s = registerActivity({ current: 5, longest: 5, lastActiveDay: "2026-01-01", shields: 0 }, "2026-01-03").streak;
    expect(s.current).toBe(1);
    expect(s.longest).toBe(5);
  });

  it("earns a shield every 7 days and spends it on a missed day", () => {
    let s = { ...empty };
    for (let d = 1; d <= 7; d++) s = registerActivity(s, `2026-01-0${d}`).streak;
    expect(s.shields).toBe(1);
    expect(effectiveStreak(s, "2026-01-09")).toBe(7);
    const u = registerActivity(s, "2026-01-09");
    expect(u.shieldsUsed).toBe(1);
    expect(u.streak.current).toBe(8);
    expect(u.streak.shields).toBe(0);
  });
});

describe("quiz engine", () => {
  const pack = QUIZ_PACKS[0];

  it("has valid content packs", () => {
    for (const p of QUIZ_PACKS) {
      expect(new Set(p.questions.map((q) => q.id)).size).toBe(p.questions.length);
      for (const q of p.questions) expect(q.answer).toBeLessThan(q.options.length);
    }
  });

  it("picks deterministic rounds", () => {
    expect(pickRound(pack, "abc").map((q) => q.id)).toEqual(pickRound(pack, "abc").map((q) => q.id));
    expect(pickRound(pack, "abc", "hard").every((q) => q.difficulty === "hard")).toBe(true);
  });

  it("scores on the server side from raw answers", () => {
    const round = pickRound(pack, "seed", "easy");
    const perfect = scoreRound(pack, round.map((q) => ({ questionId: q.id, choice: q.answer })));
    expect(perfect).toMatchObject({ correct: 10, total: 10, perfect: true, xp: 10 * 2 + PERFECT_BONUS });
    const wrong = scoreRound(pack, round.map((q) => ({ questionId: q.id, choice: -1 })));
    expect(wrong).toMatchObject({ correct: 0, xp: 0, perfect: false });
  });

  it("rejects forged submissions", () => {
    const q = pack.questions[0];
    expect(() => scoreRound(pack, [])).toThrow(InvalidQuizSubmission);
    expect(() => scoreRound(pack, [{ questionId: "nope", choice: 0 }])).toThrow(InvalidQuizSubmission);
    expect(() => scoreRound(pack, [q, q].map((x) => ({ questionId: x.id, choice: x.answer })))).toThrow(InvalidQuizSubmission);
  });
});

describe("quests", () => {
  it("always includes a reading quest and is stable per day", () => {
    for (const day of ["2026-01-01", "2026-05-17", "2026-12-31"]) {
      const quests = questsForDay(day);
      expect(quests).toHaveLength(3);
      expect(quests[0].metric).toBe("chapter_read");
      expect(new Set(quests.map((q) => q.id)).size).toBe(3);
      expect(questsForDay(day)).toEqual(quests);
    }
  });

  it("computes progress from the day's counters", () => {
    const [reading] = questStatuses("2026-01-01", { chapter_read: 99 });
    expect(reading.completed).toBe(true);
    expect(reading.progress).toBe(reading.quest.target);
  });
});

describe("progression engine", () => {
  const day = "2026-03-02";
  function run(state: ProgressState, activities: Activity[], claimed = new Set<string>()) {
    const results: ApplyResult[] = [];
    for (const a of activities) {
      const r = applyActivity(state, a, { day, alreadyClaimed: (k) => claimed.has(k) });
      results.push(r);
      if (r.ok) {
        state = r.state;
        claimed.add(r.key);
      }
    }
    return { state, results };
  }

  it("rewards reading a chapter once per day, with a first-read bonus", () => {
    const { state, results } = run(createProgressState(day), [
      { type: "chapter_read", book: "gn", chapter: 1 },
      { type: "chapter_read", book: "gn", chapter: 1 },
    ]);
    expect(results[0].ok).toBe(true);
    expect(results[1]).toMatchObject({ ok: false, reason: "duplicate" });
    expect(state.readChapters).toEqual(["gn.1"]);
    expect(state.streak.current).toBe(1);
    // chapter + first read + "Primeiro Passo" achievement (+ a quest if today's reading quest is "ler-1")
    const reward = results[0].ok ? results[0].reward : null;
    expect(reward?.achievements.map((a) => a.id)).toContain("primeiro-passo");
    expect(state.xp).toBe(reward?.xp);
  });

  it("rejects invalid activities", () => {
    const r = applyActivity(createProgressState(day), { type: "chapter_read", book: "gn", chapter: 51 }, { day, alreadyClaimed: () => false });
    expect(r).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("applies daily caps but keeps counting", () => {
    const verses = Array.from({ length: 20 }, (_, i): Activity => ({ type: "verse_highlighted", verse: `ps.119.${i + 1}` }));
    const { state, results } = run(createProgressState(day), verses);
    const zeroLines = results.filter((r) => r.ok && r.reward.lines[0].xp === 0);
    expect(zeroLines).toHaveLength(5);
    expect(state.today.counts.verse_highlighted).toBe(20);
  });

  it("completes the day's quests exactly once and grants the full-day bonus", () => {
    const all: Activity[] = [
      ...Array.from({ length: 3 }, (_, i): Activity => ({ type: "chapter_read", book: "mc", chapter: i + 1 })),
      { type: "quiz_completed", sessionId: "session-0001", score: { packId: "quiz-classico", correct: 10, total: 10, perfect: true, xp: 30 } },
      { type: "verse_favorited", verse: "mc.1.1" },
      ...Array.from({ length: 3 }, (_, i): Activity => ({ type: "verse_highlighted", verse: `mc.1.${i + 1}` })),
      { type: "note_written", verse: "mc.1.1" },
      { type: "mentor_question", messageId: "m1" },
      { type: "daily_verse_read" },
    ];
    const { state, results } = run(createProgressState(day), all);
    expect(state.today.questsClaimed).toHaveLength(3);
    expect(state.today.fullDayClaimed).toBe(true);
    const fullDayRewards = results.filter((r) => r.ok && r.reward.fullDay);
    expect(fullDayRewards).toHaveLength(1);
  });

  it("starts a fresh day and keeps the streak", () => {
    const first = run(createProgressState(day), [{ type: "daily_verse_read" }]).state;
    const r = applyActivity(first, { type: "daily_verse_read" }, { day: "2026-03-03", alreadyClaimed: () => false });
    expect(r.ok && r.state.today.day).toBe("2026-03-03");
    expect(r.ok && r.state.streak.current).toBe(2);
  });
});
