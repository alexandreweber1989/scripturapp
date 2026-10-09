import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookProgress, ChapterGrid } from "@/components/bible/reading-progress";
import { Card, Skeleton } from "@/components/ui";
import { BOOKS, getBookBySlug } from "@/domain/bible/books";

export function generateStaticParams() {
  return BOOKS.map((b) => ({ livro: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/biblia/[livro]">): Promise<Metadata> {
  const book = getBookBySlug((await params).livro);
  return { title: book ? book.name : "Livro não encontrado" };
}

async function BookDetails({ params }: { params: PageProps<"/biblia/[livro]">["params"] }) {
  const book = getBookBySlug((await params).livro);
  if (!book) notFound();
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          {book.testament === "old" ? "Antigo Testamento" : "Novo Testamento"} · {book.category}
        </p>
        <h1 className="font-display text-4xl font-bold">{book.name}</h1>
      </header>
      <Card className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted">Autor (tradição)</p>
          <p className="font-medium">{book.author}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Data aproximada</p>
          <p className="font-medium">{book.date}</p>
        </div>
        <div>
          <p className="text-xs text-muted">Tema</p>
          <p className="font-medium">{book.theme}</p>
        </div>
      </Card>
      <BookProgress book={book} />
      <ChapterGrid book={book} />
    </div>
  );
}

export default function BookPage({ params }: PageProps<"/biblia/[livro]">) {
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <BookDetails params={params} />
    </Suspense>
  );
}
