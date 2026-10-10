import { ArrowRight, Brain, Clock, Lock, Puzzle, Route } from "lucide-react";
import type { Metadata } from "next";
import Link from "@/components/transition-link";
import { SectionTitle } from "@/components/ui";
import { QUIZ_PACKS } from "@/content/games";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Jogos" };

/** Engines planned for the next phases (see docs/ROADMAP.md). */
const COMING_SOON = [
  { title: "Ligue os Pares", description: "Profecia ↔ cumprimento, personagem ↔ feito, Antigo ↔ Novo Testamento." },
  { title: "Linha do Tempo", description: "Coloque os acontecimentos bíblicos na ordem certa." },
  { title: "Detetive Bíblico", description: "Pistas progressivas: quanto antes acertar, mais pontos." },
  { title: "Caça-Palavras", description: "Encontre nomes e lugares escondidos." },
  { title: "Histórias Interativas", description: "Viva a história e faça escolhas." },
];

const DAILY = [
  { href: "/jogos/palavra-do-dia", title: "Palavra do Dia", description: "Descubra a palavra bíblica em 6 tentativas e compartilhe o resultado.", icon: Puzzle, tone: "bg-gradient-gold" },
  { href: "/trilhas", title: "Trilhas", description: "Leia, responda 3 perguntas por capítulo e domine uma jornada.", icon: Route, tone: "bg-gradient-primary" },
  { href: "/memorizar", title: "Memorização", description: "Revise seus versículos favoritos com repetição espaçada.", icon: Brain, tone: "bg-gradient-accent" },
];

export default function GamesPage() {
  return (
    <PageTransition>
      <div className="space-y-10">
        <header>
          <h1 className="font-display text-3xl font-bold">Jogos</h1>
          <p className="mt-1 text-muted">Aprenda brincando. Cada rodada vale XP — e um gabarito vale bônus.</p>
        </header>

        <section>
          <SectionTitle eyebrow="Todos os dias" title="Desafios diários" />
          <ul className="grid gap-4 sm:grid-cols-3">
            {DAILY.map(({ href, title, description, icon: Icon, tone }) => (
              <li key={href}>
                <Link href={href} className="sheen glass premium-lift group flex h-full flex-col gap-3 rounded-2xl border border-line p-5 shadow-card">
                  <span className={`grid size-12 place-items-center rounded-xl text-white shadow-card ${tone}`}>
                    <Icon className="size-6" />
                  </span>
                  <h3 className="font-display text-xl font-bold">{title}</h3>
                  <p className="flex-1 text-sm text-muted">{description}</p>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                    Abrir <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionTitle eyebrow="Disponíveis" title="Desafios de conhecimento" />
          <ul className="grid gap-4 sm:grid-cols-2">
            {QUIZ_PACKS.map((pack) => (
              <li key={pack.id}>
                <Link
                  href={`/jogos/${pack.id}`}
                  className="group flex h-full flex-col gap-3 rounded-2xl glass border border-line p-5 shadow-card premium-lift"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">
                      {pack.variant === "true-false" ? "Verdadeiro ou Falso" : "Múltipla escolha"}
                    </span>
                    {pack.secondsPerQuestion && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <Clock className="size-3.5" /> {pack.secondsPerQuestion}s por pergunta
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-bold">{pack.title}</h3>
                  <p className="flex-1 text-sm text-muted">{pack.description}</p>
                  <span className="flex items-center gap-1 text-sm font-semibold text-primary">
                    Jogar <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionTitle eyebrow="Em construção" title="Próximos jogos" />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COMING_SOON.map((game) => (
              <li key={game.title} className="rounded-2xl border border-dashed border-line p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <Lock className="size-4 text-muted" /> {game.title}
                </p>
                <p className="mt-1 text-sm text-muted">{game.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </PageTransition>
  );
}
