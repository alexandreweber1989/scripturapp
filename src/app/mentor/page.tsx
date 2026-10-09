import type { Metadata } from "next";
import { Suspense } from "react";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { Skeleton } from "@/components/ui";

export const metadata: Metadata = { title: "Mentor" };

export default function MentorPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <MentorChat />
    </Suspense>
  );
}
