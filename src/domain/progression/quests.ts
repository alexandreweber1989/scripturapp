import { hashString, seededRandom, shuffle } from "../random";
import type { Counts, Metric } from "./activities";

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  metric: Metric;
  target: number;
  xp: number;
  href: string;
}

const READING_QUESTS: QuestDefinition[] = [
  { id: "ler-1", title: "Abra a Palavra", description: "Leia 1 capítulo da Bíblia.", metric: "chapter_read", target: 1, xp: 15, href: "/biblia" },
  { id: "ler-3", title: "Maratona curta", description: "Leia 3 capítulos hoje.", metric: "chapter_read", target: 3, xp: 35, href: "/biblia" },
];

const OTHER_QUESTS: QuestDefinition[] = [
  { id: "quiz-1", title: "Guerreiro da Palavra", description: "Complete 1 rodada de quiz.", metric: "quiz_completed", target: 1, xp: 20, href: "/jogos" },
  { id: "quiz-perfeito", title: "Gabarito", description: "Acerte todas as perguntas de um quiz.", metric: "quiz_perfect", target: 1, xp: 40, href: "/jogos" },
  { id: "favorito-1", title: "Guardião de Relíquias", description: "Guarde 1 versículo nos favoritos.", metric: "verse_favorited", target: 1, xp: 15, href: "/biblia" },
  { id: "destaque-3", title: "Iluminador", description: "Destaque 3 versículos.", metric: "verse_highlighted", target: 3, xp: 15, href: "/biblia" },
  { id: "reflexao-1", title: "Escriba Moderno", description: "Escreva 1 reflexão sobre um versículo.", metric: "note_written", target: 1, xp: 20, href: "/biblia" },
  { id: "mentor-1", title: "Conselho Sábio", description: "Faça uma pergunta ao seu mentor.", metric: "mentor_question", target: 1, xp: 15, href: "/mentor" },
  { id: "versiculo-dia", title: "Pão Diário", description: "Medite no versículo do dia.", metric: "daily_verse_read", target: 1, xp: 10, href: "/" },
];

export const ALL_QUESTS: readonly QuestDefinition[] = [...READING_QUESTS, ...OTHER_QUESTS];

/** Bonus for finishing all quests of the day. */
export const FULL_DAY_BONUS = 25;
export const QUESTS_PER_DAY = 3;

/** The day's quests: always one reading quest plus two others, identical for everyone on that day. */
export function questsForDay(day: string): QuestDefinition[] {
  const random = seededRandom(hashString(`quests:${day}`));
  const reading = READING_QUESTS[Math.floor(random() * READING_QUESTS.length)];
  const others = shuffle(OTHER_QUESTS, random).slice(0, QUESTS_PER_DAY - 1);
  return [reading, ...others];
}

export interface QuestStatus {
  quest: QuestDefinition;
  progress: number;
  completed: boolean;
}

export function questStatuses(day: string, counts: Counts): QuestStatus[] {
  return questsForDay(day).map((quest) => {
    const progress = Math.min(counts[quest.metric] ?? 0, quest.target);
    return { quest, progress, completed: progress >= quest.target };
  });
}
