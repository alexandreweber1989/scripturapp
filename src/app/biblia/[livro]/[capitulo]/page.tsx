import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChapterReader } from "@/components/bible/chapter-reader";
import { Skeleton } from "@/components/ui";
import { BOOKS, getBookBySlug, isValidChapter, nextChapter, previousChapter } from "@/domain/bible/books";
import { getChapterQuiz } from "@/content/chapter-quizzes";
import { TRANSLATION, getChapterVerses } from "@/lib/server/bible";
import { PageTransition } from "@/components/page-transition";

type Params = PageProps<"/biblia/[livro]/[capitulo]">["params"];

/** All 1,189 chapters are prerendered: reading is instant and works great for SEO. */
export function generateStaticParams() {
  return BOOKS.flatMap((b) => Array.from({ length: b.chapters }, (_, i) => ({ livro: b.slug, capitulo: String(i + 1) })));
}

async function resolve(params: Params) {
  const { livro, capitulo } = await params;
  const book = getBookBySlug(livro);
  const chapter = Number(capitulo);
  if (!book || !isValidChapter(book, chapter)) return null;
  return { book, chapter };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const ref = await resolve(params);
  if (!ref) return { title: "Capítulo não encontrado" };
  const verses = await getChapterVerses(ref.book.id, ref.chapter);
  return {
    title: `${ref.book.name} ${ref.chapter}`,
    description: verses?.[0]?.slice(0, 155),
  };
}

async function Chapter({ params }: { params: Params }) {
  const ref = await resolve(params);
  if (!ref) notFound();
  const verses = await getChapterVerses(ref.book.id, ref.chapter);
  if (!verses) notFound();
  const prev = previousChapter(ref);
  const next = nextChapter(ref);
  return (
    <ChapterReader
      bookId={ref.book.id}
      chapter={ref.chapter}
      verses={verses}
      translation={TRANSLATION.short}
      prev={prev && { slug: prev.book.slug, name: prev.book.name, chapter: prev.chapter }}
      next={next && { slug: next.book.slug, name: next.book.name, chapter: next.chapter }}
      quiz={getChapterQuiz(`${ref.book.id}.${ref.chapter}`)}
    />
  );
}

export default function ChapterPage({ params }: PageProps<"/biblia/[livro]/[capitulo]">) {
  return (
    <PageTransition>
      <Suspense fallback={<Skeleton className="h-[70vh]" />}>
        <Chapter params={params} />
      </Suspense>
    </PageTransition>
  );
}
