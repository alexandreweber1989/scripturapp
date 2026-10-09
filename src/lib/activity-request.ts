import { z } from "zod";
import { getChapterQuiz } from "@/content/chapter-quizzes";
import dailyWords from "@/content/daily-words.json";
import { getQuizPack } from "@/content/games";
import { chapterKey } from "@/domain/bible/books";
import { InvalidChapterQuizSubmission, scoreChapterQuiz } from "@/domain/games/chapter-quiz";
import { type DailyWord, InvalidDailyWordSubmission, scoreDailyWord, wordForDay } from "@/domain/games/daily-word";
import { InvalidQuizSubmission, scoreRound } from "@/domain/games/quiz";
import type { Activity } from "@/domain/progression/activities";
import { dayKey } from "@/domain/time";

const verse = z.string().regex(/^[0-9a-z]{2,4}\.\d{1,3}\.\d{1,3}$/);
const answers = z.array(z.object({ questionId: z.string().max(32), choice: z.number().int().min(-1).max(9) }));

/**
 * What a client may send. Note what is absent: XP amounts, quiz scores and
 * server-only activities (`mentor_question`). The server derives all of that.
 */
export const activityRequestSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("chapter_read"), book: z.string().max(4), chapter: z.number().int().positive() }),
  z.object({
    type: z.literal("quiz_completed"),
    packId: z.string().max(64),
    sessionId: z.string().regex(/^[\w-]{8,64}$/),
    answers: answers.min(1).max(50),
  }),
  z.object({
    type: z.literal("chapter_quiz_completed"),
    book: z.string().max(4),
    chapter: z.number().int().positive(),
    sessionId: z.string().regex(/^[\w-]{8,64}$/),
    answers: answers.min(1).max(10),
  }),
  z.object({ type: z.literal("daily_word_completed"), guesses: z.array(z.string().max(5)).min(1).max(6) }),
  z.object({ type: z.literal("verse_reviewed"), verse }),
  z.object({ type: z.literal("verse_favorited"), verse }),
  z.object({ type: z.literal("verse_highlighted"), verse }),
  z.object({ type: z.literal("note_written"), verse }),
  z.object({ type: z.literal("daily_verse_read") }),
]);

export type ActivityRequest = z.infer<typeof activityRequestSchema>;

export class InvalidActivityRequest extends Error {}

/** Turns a client request into a trusted activity (scoring games from raw answers). */
export function resolveActivityRequest(request: ActivityRequest): Activity {
  try {
    switch (request.type) {
      case "quiz_completed": {
        const pack = getQuizPack(request.packId);
        if (!pack) throw new InvalidActivityRequest("Jogo desconhecido.");
        return { type: "quiz_completed", sessionId: request.sessionId, score: scoreRound(pack, request.answers) };
      }
      case "chapter_quiz_completed": {
        const questions = getChapterQuiz(chapterKey(request.book, request.chapter));
        if (!questions) throw new InvalidActivityRequest("Este capítulo ainda não tem quiz.");
        const { book, chapter, sessionId } = request;
        return { type: "chapter_quiz_completed", book, chapter, sessionId, score: scoreChapterQuiz(questions, request.answers) };
      }
      case "daily_word_completed": {
        // Always today's word, by the server's clock: yesterday's game can't be replayed for XP.
        const day = dayKey();
        const answer = wordForDay(day, dailyWords as DailyWord[]).word;
        return { type: "daily_word_completed", result: scoreDailyWord(day, request.guesses, answer) };
      }
      default:
        return request;
    }
  } catch (error) {
    if (error instanceof InvalidQuizSubmission || error instanceof InvalidChapterQuizSubmission || error instanceof InvalidDailyWordSubmission) {
      throw new InvalidActivityRequest(error.message);
    }
    throw error;
  }
}
