import type { Metadata } from "next";
import { MemoryReview } from "@/components/memory/memory-review";

export const metadata: Metadata = { title: "Memorização" };

export default function MemoryPage() {
  return <MemoryReview />;
}
