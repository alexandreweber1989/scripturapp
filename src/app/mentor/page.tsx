import type { Metadata } from "next";
import { Suspense } from "react";
import { MentorChat } from "@/components/mentor/mentor-chat";
import { Skeleton } from "@/components/ui";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Mentor" };

export default function MentorPage() {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-96" />}>
        <MentorChat />
      </Suspense>
    </PageTransition>
  );
}
