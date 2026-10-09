import { z } from "zod";
import { getQuizPack } from "@/content/games";
import { InvalidQuizSubmission, scoreRound } from "@/domain/games/quiz";
import type { Activity } from "@/domain/progression/activities";

const verse = z.string().regex(/^[0-9a-z]{2,4}\.\d{1,3}\.\d{1,3}$/);

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
    answers: z.array(z.object({ questionId: z.string().max(32), choice: z.number().int().min(-1).max(9) })).min(1).max(50),
  }),
  z.object({ type: z.literal("verse_favorited"), verse }),
  z.object({ type: z.literal("verse_highlighted"), verse }),
  z.object({ type: z.literal("note_written"), verse }),
  z.object({ type: z.literal("daily_verse_read") }),
]);

export type ActivityRequest = z.infer<typeof activityRequestSchema>;

export class InvalidActivityRequest extends Error {}

/** Turns a client request into a trusted activity (scoring quizzes from raw answers). */
export function resolveActivityRequest(request: ActivityRequest): Activity {
  if (request.type !== "quiz_completed") return request;
  const pack = getQuizPack(request.packId);
  if (!pack) throw new InvalidActivityRequest("Jogo desconhecido.");
  try {
    return { type: "quiz_completed", sessionId: request.sessionId, score: scoreRound(pack, request.answers) };
  } catch (error) {
    if (error instanceof InvalidQuizSubmission) throw new InvalidActivityRequest(error.message);
    throw error;
  }
}
