import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { TrailPath } from "@/components/trails/trail-views";
import { Skeleton } from "@/components/ui";
import { TRAILS, getTrail } from "@/domain/trails";

export function generateStaticParams() {
  return TRAILS.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps<"/trilhas/[id]">): Promise<Metadata> {
  return { title: getTrail((await params).id)?.title ?? "Trilha" };
}

async function Trail({ params }: { params: PageProps<"/trilhas/[id]">["params"] }) {
  const trail = getTrail((await params).id);
  if (!trail) notFound();
  return <TrailPath trail={trail} />;
}

export default function TrailPage({ params }: PageProps<"/trilhas/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <Trail params={params} />
    </Suspense>
  );
}
