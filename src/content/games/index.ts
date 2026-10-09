import { getChapterQuiz } from "@/content/chapter-quizzes";
import type { QuizPack, QuizQuestion } from "@/domain/games/quiz";
import { BOSS_PACK_PREFIX, type Trail, TRAILS, bossPackId, getTrail, stepLabel } from "@/domain/trails";
import classico from "./quiz-classico.json";
import verdadeiroOuFalso from "./verdadeiro-ou-falso.json";

/**
 * Game content packs. Every game is an *engine* (quiz, matching, ordering…)
 * fed by a pack, so adding a new game is mostly adding data.
 */
export const QUIZ_PACKS: readonly QuizPack[] = [
  {
    id: "quiz-classico",
    title: "Quiz Bíblico",
    description: "300 perguntas do Antigo e do Novo Testamento, do fácil ao difícil.",
    variant: "multiple-choice",
    questionsPerRound: 10,
    secondsPerQuestion: 30,
    questions: classico as QuizQuestion[],
  },
  {
    id: "verdadeiro-ou-falso",
    title: "Verdadeiro ou Falso",
    description: "Afirmações rápidas: confie no que você leu, não no que ouviu falar.",
    variant: "true-false",
    questionsPerRound: 10,
    secondsPerQuestion: 10,
    questions: verdadeiroOuFalso as QuizQuestion[],
  },
];

/** A trail's final challenge: a round drawn from the questions of all its chapters. */
export function trailBossPack(trail: Trail): QuizPack {
  const questions: QuizQuestion[] = trail.steps.flatMap((key) =>
    (getChapterQuiz(key) ?? []).map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: q.options,
      answer: q.answer,
      difficulty: "medium" as const,
      category: stepLabel(key),
      explanation: q.explanation,
      reference: `${stepLabel(key)}:${q.verse}`,
    })),
  );
  return {
    id: bossPackId(trail),
    title: `Desafio final: ${trail.title}`,
    description: `Perguntas de todos os capítulos da trilha. Acerte 70% para dominá-la e ganhar a relíquia ${trail.relic}.`,
    variant: "multiple-choice",
    questionsPerRound: 10,
    secondsPerQuestion: 25,
    questions,
  };
}

export function getQuizPack(id: string): QuizPack | undefined {
  if (id.startsWith(BOSS_PACK_PREFIX)) {
    const trail = getTrail(id.slice(BOSS_PACK_PREFIX.length));
    return trail ? trailBossPack(trail) : undefined;
  }
  return QUIZ_PACKS.find((p) => p.id === id);
}

export const BOSS_PACK_IDS = TRAILS.map(bossPackId);
