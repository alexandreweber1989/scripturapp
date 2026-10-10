import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuizGame } from "@/components/games/quiz-game";
import { BossGate } from "@/components/trails/trail-views";
import { Skeleton } from "@/components/ui";
import { trailBossPack } from "@/content/games";
import { TRAILS, getTrail } from "@/domain/trails";
import { PageTransition } from "@/components/page-transition";

export function generateStaticParams() {
  return TRAILS.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/trilhas/[id]/desafio">): Promise<Metadata> {
  const trail = getTrail((await params).id);
  return { title: trail ? `Desafio final · ${trail.title}` : "Desafio final" };
}

async function Boss({ params }: { params: PageProps<"/trilhas/[id]/desafio">["params"] }) {
  const trail = getTrail((await params).id);
  if (!trail) notFound();
  return (
    <BossGate trail={trail}>
      <QuizGame pack={trailBossPack(trail)} backHref={`/trilhas/${trail.id}`} backLabel="Voltar à trilha" />
    </BossGate>
  );
}

export default function BossPage({ params }: PageProps<"/trilhas/[id]/desafio">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Boss params={params} />
      </Suspense>
    </PageTransition>
  );
}
