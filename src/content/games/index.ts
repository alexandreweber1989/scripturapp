import type { QuizPack, QuizQuestion } from "@/domain/games/quiz";
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

export function getQuizPack(id: string): QuizPack | undefined {
  return QUIZ_PACKS.find((p) => p.id === id);
}
