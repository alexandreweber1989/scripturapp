import type { Metadata } from "next";
import { TrailCard } from "@/components/trails/trail-views";
import { TRAILS } from "@/domain/trails";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Trilhas" };

export default function TrailsPage() {
  return (
    <PageTransition>
      <div className="space-y-8">
        <header>
          <p className="tabular-nums text-[11px] uppercase tracking-[0.18em] text-primary">Jornadas guiadas</p>
          <h1 className="font-display text-3xl font-bold">Trilhas</h1>
          <p className="mt-1 max-w-2xl text-muted">
            Leia cada capítulo, responda 3 perguntas sobre ele e avance. No fim, vença o desafio final para dominar a trilha e ganhar uma relíquia.
          </p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRAILS.map((trail) => (
            <li key={trail.id}>
              <TrailCard trail={trail} />
            </li>
          ))}
        </ul>
      </div>
    </PageTransition>
  );
}
