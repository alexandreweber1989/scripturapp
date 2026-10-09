import { getBook, isValidChapter, parseVerseKey } from "../bible/books";
import type { QuizScore } from "../games/quiz";

/** Everything that can move a player's progress. */
export type Metric =
  | "chapter_read"
  | "quiz_completed"
  | "quiz_perfect"
  | "verse_favorited"
  | "verse_highlighted"
  | "note_written"
  | "daily_verse_read"
  | "mentor_question";

export type Counts = Partial<Record<Metric, number>>;

/**
 * An activity after validation. Quizzes arrive already scored: on the server
 * the route handler scores the raw answers before building this.
 */
export type Activity =
  | { type: "chapter_read"; book: string; chapter: number }
  | { type: "quiz_completed"; sessionId: string; score: QuizScore }
  | { type: "verse_favorited"; verse: string }
  | { type: "verse_highlighted"; verse: string }
  | { type: "note_written"; verse: string }
  | { type: "daily_verse_read" }
  | { type: "mentor_question"; messageId: string };

export interface ActivityRule {
  label: string;
  /** Max rewarded occurrences per day. Beyond it the activity still counts for quests, but gives no XP. */
  dailyCap: number;
}

export const RULES: Record<Activity["type"], ActivityRule> = {
  chapter_read: { label: "Capítulo lido", dailyCap: 30 },
  quiz_completed: { label: "Quiz concluído", dailyCap: 6 },
  verse_favorited: { label: "Versículo guardado", dailyCap: 10 },
  verse_highlighted: { label: "Versículo destacado", dailyCap: 15 },
  note_written: { label: "Reflexão escrita", dailyCap: 5 },
  daily_verse_read: { label: "Versículo do dia", dailyCap: 1 },
  mentor_question: { label: "Conversa com o mentor", dailyCap: 5 },
};

export const CHAPTER_XP = 10;
export const FIRST_READ_BONUS = 5;
export const FAVORITE_XP = 2;
export const HIGHLIGHT_XP = 1;
export const NOTE_XP = 5;
export const DAILY_VERSE_XP = 3;
export const MENTOR_XP = 3;

/**
 * Idempotency key: the same key is never rewarded twice. Day-scoped keys
 * allow a repeat tomorrow; the rest are once-ever.
 */
export function activityKey(activity: Activity, day: string): string {
  switch (activity.type) {
    case "chapter_read":
      return `chapter:${activity.book}.${activity.chapter}:${day}`;
    case "quiz_completed":
      return `quiz:${activity.sessionId}`;
    case "verse_favorited":
      return `fav:${activity.verse}`;
    case "verse_highlighted":
      return `hl:${activity.verse}`;
    case "note_written":
      return `note:${activity.verse}:${day}`;
    case "daily_verse_read":
      return `dv:${day}`;
    case "mentor_question":
      return `mentor:${activity.messageId}`;
  }
}

/** Structural validation shared by the client store and the API. */
export function isValidActivity(activity: Activity): boolean {
  switch (activity.type) {
    case "chapter_read": {
      const book = getBook(activity.book);
      return !!book && isValidChapter(book, activity.chapter);
    }
    case "verse_favorited":
    case "verse_highlighted":
    case "note_written":
      return parseVerseKey(activity.verse) !== null;
    case "quiz_completed":
      return /^[\w-]{8,64}$/.test(activity.sessionId);
    case "mentor_question":
      return activity.messageId.length > 0;
    case "daily_verse_read":
      return true;
  }
}
