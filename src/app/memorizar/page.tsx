import type { Metadata } from "next";
import { MemoryReview } from "@/components/memory/memory-review";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Memorização" };

export default function MemoryPage() {
  return (
    <PageTransition>
      <MemoryReview />
    </PageTransition>
  );
}
