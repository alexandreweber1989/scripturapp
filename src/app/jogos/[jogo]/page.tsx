import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { QuizGame } from "@/components/games/quiz-game";
import { Skeleton } from "@/components/ui";
import { QUIZ_PACKS, getQuizPack } from "@/content/games";
import { PageTransition } from "@/components/page-transition";

export function generateStaticParams() {
  return QUIZ_PACKS.map((p) => ({ jogo: p.id }));
}

export async function generateMetadata({ params }: PageProps<"/jogos/[jogo]">): Promise<Metadata> {
  return { title: getQuizPack((await params).jogo)?.title ?? "Jogo" };
}

async function Game({ params }: { params: PageProps<"/jogos/[jogo]">["params"] }) {
  const pack = getQuizPack((await params).jogo);
  if (!pack) notFound();
  return <QuizGame pack={pack} />;
}

export default function GamePage({ params }: PageProps<"/jogos/[jogo]">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Game params={params} />
      </Suspense>
    </PageTransition>
  );
}
