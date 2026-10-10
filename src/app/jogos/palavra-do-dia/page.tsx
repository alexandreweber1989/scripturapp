import type { Metadata } from "next";
import { DailyWordGame } from "@/components/games/daily-word-game";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = {
  title: "Palavra do Dia",
  description: "Descubra a palavra bíblica do dia em até 6 tentativas e compartilhe seu resultado.",
};

export default function DailyWordPage() {
  return (
    <PageTransition>
      <DailyWordGame />
    </PageTransition>
  );
}
