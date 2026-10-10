import { describe, expect, it } from "vitest";
import { chapterQuizKeys, getChapterQuiz } from "@/content/chapter-quizzes";
import dailyWords from "@/content/daily-words.json";
import { getQuizPack, trailBossPack } from "@/content/games";
import { getBook } from "../bible/books";
import { CHAPTER_QUIZ_PERFECT_BONUS, CHAPTER_QUIZ_XP_PER_CORRECT, InvalidChapterQuizSubmission, scoreChapterQuiz } from "../games/chapter-quiz";
import {
  type DailyWord,
  InvalidDailyWordSubmission,
  dailyWordXp,
  evaluateGuess,
  normalizeGuess,
  scoreDailyWord,
  shareText,
  wordForDay,
} from "../games/daily-word";
import { clozeVerse, gradeReview, isDue, newReview } from "../memory/srs";
import type { Activity } from "../progression/activities";
import { applyActivity } from "../progression/engine";
import { type ProgressState, createProgressState } from "../progression/state";
import { TRAILS, TRAIL_COMPLETE_BONUS, TRAIL_MASTERY_BONUS, bossPackId, trailProgress } from "../trails";

const WORDS = dailyWords as DailyWord[];
const day = "2026-04-05";

function apply(state: ProgressState, activity: Activity, d = day) {
  const r = applyActivity(state, activity, { day: d, alreadyClaimed: () => false });
  if (!r.ok) throw new Error(`rejected: ${r.reason}`);
  return r;
}

describe("content", () => {
  it("has a 3-question quiz, grounded in a real verse, for every trail step", () => {
    for (const trail of TRAILS) {
      for (const key of trail.steps) {
        const quiz = getChapterQuiz(key);
        expect(quiz, key).toHaveLength(3);
        const [bookId, ch] = key.split(".");
        expect(getBook(bookId), key).toBeDefined();
        for (const q of quiz!) {
          expect(q.options).toHaveLength(4);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(4);
          expect(q.id).toBe(`cq-${bookId}-${ch}-${q.id.split("-").at(-1)}`);
          expect(q.verse).toBeGreaterThan(0);
        }
      }
    }
    const ids = chapterQuizKeys().flatMap((k) => getChapterQuiz(k)!.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("builds a final challenge for every trail", () => {
    for (const trail of TRAILS) {
      const pack = getQuizPack(bossPackId(trail));
      expect(pack?.questions.length).toBeGreaterThanOrEqual(pack!.questionsPerRound);
    }
  });

  it("has valid daily words", () => {
    for (const w of WORDS) expect(w.word).toMatch(/^[A-Z]{5}$/);
    expect(new Set(WORDS.map((w) => w.word)).size).toBe(WORDS.length);
  });
});

describe("chapter quiz", () => {
  const questions = getChapterQuiz("jo.3")!;
  const perfect = questions.map((q) => ({ questionId: q.id, choice: q.answer }));

  it("requires every question, once", () => {
    expect(scoreChapterQuiz(questions, perfect)).toEqual({ correct: 3, total: 3 });
    expect(() => scoreChapterQuiz(questions, perfect.slice(0, 2))).toThrow(InvalidChapterQuizSubmission);
    expect(() => scoreChapterQuiz(questions, [perfect[0], perfect[0], perfect[1]])).toThrow(InvalidChapterQuizSubmission);
  });

  it("only pays XP for improvements", () => {
    let state = createProgressState(day);
    const first = apply(state, { type: "chapter_quiz_completed", book: "jo", chapter: 3, sessionId: "session-a1", score: { correct: 2, total: 3 } });
    expect(first.reward.lines[0].xp).toBe(2 * CHAPTER_QUIZ_XP_PER_CORRECT);
    state = first.state;
    const same = apply(state, { type: "chapter_quiz_completed", book: "jo", chapter: 3, sessionId: "session-a2", score: { correct: 2, total: 3 } });
    expect(same.reward.lines[0].xp).toBe(0);
    const better = apply(same.state, { type: "chapter_quiz_completed", book: "jo", chapter: 3, sessionId: "session-a3", score: { correct: 3, total: 3 } });
    expect(better.reward.lines.slice(0, 2).map((l) => l.xp)).toEqual([CHAPTER_QUIZ_XP_PER_CORRECT, CHAPTER_QUIZ_PERFECT_BONUS]);
    expect(better.state.chapterQuizzes["jo.3"]).toBe(3);
    expect(first.reward.perfectQuiz).toBe(false);
    expect(better.reward.perfectQuiz).toBe(true);
    const again = apply(better.state, { type: "chapter_quiz_completed", book: "jo", chapter: 3, sessionId: "session-a4", score: { correct: 3, total: 3 } });
    expect(again.reward.perfectQuiz).toBe(false);
  });
});

describe("trails", () => {
  const trail = TRAILS.find((t) => t.id === "primeiros-passos")!;

  function passAll(state: ProgressState) {
    let last = null as ReturnType<typeof apply> | null;
    trail.steps.forEach((key, i) => {
      const [book, ch] = key.split(".");
      last = apply(state, { type: "chapter_quiz_completed", book, chapter: Number(ch), sessionId: `session-t${i}`, score: { correct: 3, total: 3 } });
      state = last.state;
    });
    return last!;
  }

  it("pays the completion bonus exactly when the last step is passed", () => {
    const last = passAll(createProgressState(day));
    expect(last.reward.lines.some((l) => l.label.includes("Trilha concluída") && l.xp === TRAIL_COMPLETE_BONUS)).toBe(true);
    expect(trailProgress(trail, last.state)).toMatchObject({ passed: 8, completed: true, mastered: false, stars: 2 });
    expect(last.state.achievements).toContain("trilheiro");
  });

  it("is mastered by the final challenge, only after completion", () => {
    const score = { packId: bossPackId(trail), correct: 8, total: 10, perfect: false, xp: 24 };
    const early = apply(createProgressState(day), { type: "quiz_completed", sessionId: "boss-early-1", score });
    expect(early.state.trailsMastered).toEqual([]);

    const done = passAll(createProgressState(day)).state;
    const boss = apply(done, { type: "quiz_completed", sessionId: "boss-final-1", score });
    expect(boss.state.trailsMastered).toEqual(["primeiros-passos"]);
    expect(boss.reward.relics).toEqual(["primeiros-passos"]);
    expect(early.reward.relics).toEqual([]);
    expect(boss.reward.lines.some((l) => l.xp === TRAIL_MASTERY_BONUS)).toBe(true);
    expect(trailProgress(trail, boss.state).stars).toBe(3);
  });

  it("builds boss rounds only from the trail's chapters", () => {
    const ids = new Set(trail.steps.flatMap((k) => getChapterQuiz(k)!.map((q) => q.id)));
    expect(trailBossPack(trail).questions.every((q) => ids.has(q.id))).toBe(true);
  });
});

describe("daily word", () => {
  it("normalizes accents", () => {
    expect(normalizeGuess("graça")).toBe("GRACA");
    expect(normalizeGuess("Simão ")).toBe("SIMAO");
  });

  it("is deterministic and cycles through the whole list before repeating", () => {
    expect(wordForDay(day, WORDS)).toEqual(wordForDay(day, WORDS));
    const seen = new Set<string>();
    const start = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < WORDS.length; i++) {
      const d = new Date(start.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      seen.add(wordForDay(d, WORDS).word);
    }
    expect(seen.size).toBe(WORDS.length);
  });

  it("evaluates repeated letters like Wordle", () => {
    expect(evaluateGuess("PEDRA", "PEDRO")).toEqual(["hit", "hit", "hit", "hit", "miss"]);
    expect(evaluateGuess("AAAAA", "MARIA")).toEqual(["miss", "hit", "miss", "miss", "hit"]);
    expect(evaluateGuess("SALMO", "MOSES".slice(0, 5))).toEqual(["near", "miss", "miss", "near", "near"]);
  });

  it("validates finished games and scores attempts", () => {
    expect(scoreDailyWord(day, ["PEDRA", "PEDRO"], "PEDRO")).toEqual({ day, solved: true, attempts: 2 });
    expect(dailyWordXp({ day, solved: true, attempts: 1 })).toBe(30);
    expect(dailyWordXp({ day, solved: true, attempts: 6 })).toBe(10);
    expect(() => scoreDailyWord(day, ["PEDRA"], "PEDRO")).toThrow(InvalidDailyWordSubmission);
    expect(() => scoreDailyWord(day, ["PEDRO", "PEDRA"], "PEDRO")).toThrow(InvalidDailyWordSubmission);
    expect(() => scoreDailyWord(day, ["pedro"], "PEDRO")).toThrow(InvalidDailyWordSubmission);
    expect(scoreDailyWord(day, Array(6).fill("PEDRA"), "PEDRO").solved).toBe(false);
  });

  it("only accepts today's game", () => {
    const activity: Activity = { type: "daily_word_completed", result: { day: "2026-04-04", solved: true, attempts: 1 } };
    expect(applyActivity(createProgressState(day), activity, { day, alreadyClaimed: () => false })).toMatchObject({ ok: false, reason: "invalid" });
  });

  it("shares a spoiler-free grid", () => {
    const text = shareText(day, ["PEDRA", "PEDRO"], "PEDRO", true);
    expect(text).toContain("2/6");
    expect(text).not.toContain("PEDRO");
  });
});

describe("memorization", () => {
  it("spaces reviews and resets on a lapse", () => {
    let r = newReview(day);
    expect(isDue(r, day)).toBe(true);
    r = gradeReview(r, "good", day);
    expect(r).toMatchObject({ interval: 2, due: "2026-04-07", reps: 1 });
    r = gradeReview(r, "good", "2026-04-07");
    expect(r.interval).toBe(6);
    r = gradeReview(r, "good", "2026-04-13");
    expect(r.interval).toBe(15);
    expect(isDue(r, "2026-04-14")).toBe(false);
    r = gradeReview(r, "again", "2026-04-28");
    expect(r).toMatchObject({ interval: 1, reps: 0, due: "2026-04-29" });
  });

  it("blanks some words, deterministically", () => {
    const text = "Porque Deus tanto amou o mundo que deu o seu Filho Unigênito";
    const a = clozeVerse(text, "jo.3.16:0");
    expect(a).toEqual(clozeVerse(text, "jo.3.16:0"));
    expect(a.some((t) => t.hidden)).toBe(true);
    expect(a.map((t) => t.text).join("")).toBe(text);
  });
});
