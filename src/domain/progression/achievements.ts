import { BOOKS, TOTAL_CHAPTERS, chapterKey } from "../bible/books";
import { CHAPTER_QUIZ_PASS } from "../games/chapter-quiz";
import { TRAILS } from "../trails";
import { levelFromXp } from "./levels";
import type { ProgressState } from "./state";

export type AchievementTier = "bronze" | "prata" | "ouro" | "lendario";

export interface Achievement {
  id: string;
  title: string;
  description: string;
  tier: AchievementTier;
  xp: number;
  isUnlocked: (state: ProgressState) => boolean;
}

function booksCompleted(state: ProgressState, ids?: string[]): number {
  const read = new Set(state.readChapters);
  return BOOKS.filter((b) => (!ids || ids.includes(b.id)) && Array.from({ length: b.chapters }, (_, i) => chapterKey(b.id, i + 1)).every((k) => read.has(k))).length;
}

const GOSPELS = ["mt", "mc", "lc", "jo"];
const NEW_TESTAMENT = BOOKS.filter((b) => b.testament === "new").map((b) => b.id);
const total = (state: ProgressState, metric: keyof ProgressState["totals"]) => state.totals[metric] ?? 0;

export const ACHIEVEMENTS: readonly Achievement[] = [
  { id: "primeiro-passo", title: "Primeiro Passo", description: "Leia seu primeiro capítulo.", tier: "bronze", xp: 20, isUnlocked: (s) => s.readChapters.length >= 1 },
  { id: "leitor-assiduo", title: "Leitor Assíduo", description: "Leia 25 capítulos diferentes.", tier: "bronze", xp: 50, isUnlocked: (s) => s.readChapters.length >= 25 },
  { id: "devorador", title: "Devorador de Pergaminhos", description: "Leia 100 capítulos diferentes.", tier: "prata", xp: 150, isUnlocked: (s) => s.readChapters.length >= 100 },
  { id: "livro-completo", title: "Do Início ao Fim", description: "Leia um livro inteiro.", tier: "bronze", xp: 50, isUnlocked: (s) => booksCompleted(s) >= 1 },
  { id: "evangelhos", title: "Boas Novas", description: "Leia os quatro Evangelhos.", tier: "ouro", xp: 300, isUnlocked: (s) => booksCompleted(s, GOSPELS) === GOSPELS.length },
  { id: "novo-testamento", title: "Nova Aliança", description: "Leia todo o Novo Testamento.", tier: "ouro", xp: 600, isUnlocked: (s) => booksCompleted(s, NEW_TESTAMENT) === NEW_TESTAMENT.length },
  { id: "biblia-completa", title: "Toda a Escritura", description: "Leia a Bíblia inteira.", tier: "lendario", xp: 2000, isUnlocked: (s) => s.readChapters.length >= TOTAL_CHAPTERS },
  { id: "fogo-3", title: "Chama Acesa", description: "Mantenha 3 dias seguidos.", tier: "bronze", xp: 30, isUnlocked: (s) => s.streak.longest >= 3 },
  { id: "fogo-7", title: "Semana Santa", description: "Mantenha 7 dias seguidos.", tier: "prata", xp: 80, isUnlocked: (s) => s.streak.longest >= 7 },
  { id: "fogo-30", title: "Fogo que Não Se Apaga", description: "Mantenha 30 dias seguidos.", tier: "ouro", xp: 300, isUnlocked: (s) => s.streak.longest >= 30 },
  { id: "fogo-100", title: "Coluna de Fogo", description: "Mantenha 100 dias seguidos.", tier: "lendario", xp: 1000, isUnlocked: (s) => s.streak.longest >= 100 },
  { id: "quiz-1", title: "Primeira Prova", description: "Complete seu primeiro quiz.", tier: "bronze", xp: 20, isUnlocked: (s) => total(s, "quiz_completed") >= 1 },
  { id: "quiz-perfeito", title: "Gabarito Sagrado", description: "Acerte todas as perguntas de um quiz.", tier: "prata", xp: 60, isUnlocked: (s) => total(s, "quiz_perfect") >= 1 },
  { id: "quiz-25", title: "Mestre das Perguntas", description: "Complete 25 quizzes.", tier: "ouro", xp: 200, isUnlocked: (s) => total(s, "quiz_completed") >= 25 },
  { id: "relicario", title: "Relicário", description: "Guarde 10 versículos favoritos.", tier: "bronze", xp: 40, isUnlocked: (s) => total(s, "verse_favorited") >= 10 },
  { id: "escriba", title: "Escriba Fiel", description: "Escreva 10 reflexões.", tier: "prata", xp: 80, isUnlocked: (s) => total(s, "note_written") >= 10 },
  { id: "trilheiro", title: "Trilheiro", description: "Conclua todas as etapas de uma trilha.", tier: "prata", xp: 0, isUnlocked: (s) => TRAILS.some((t) => t.steps.every((k) => (s.chapterQuizzes[k] ?? 0) >= CHAPTER_QUIZ_PASS)) },
  { id: "mestre-das-trilhas", title: "Mestre das Trilhas", description: "Vença o desafio final de uma trilha.", tier: "ouro", xp: 0, isUnlocked: (s) => s.trailsMastered.length >= 1 },
  { id: "palavra-7", title: "Decifrador de Pergaminhos", description: "Descubra 7 Palavras do Dia.", tier: "prata", xp: 60, isUnlocked: (s) => total(s, "daily_word_solved") >= 7 },
  { id: "memoria-25", title: "Escrito no Coração", description: "Faça 25 revisões de versículos.", tier: "prata", xp: 60, isUnlocked: (s) => total(s, "verse_reviewed") >= 25 },
  { id: "nivel-5", title: "Discípulo", description: "Alcance o nível 5.", tier: "bronze", xp: 0, isUnlocked: (s) => levelFromXp(s.xp) >= 5 },
  { id: "nivel-10", title: "Escriba", description: "Alcance o nível 10.", tier: "prata", xp: 0, isUnlocked: (s) => levelFromXp(s.xp) >= 10 },
  { id: "nivel-25", title: "Juiz de Israel", description: "Alcance o nível 25.", tier: "ouro", xp: 0, isUnlocked: (s) => levelFromXp(s.xp) >= 25 },
];

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
