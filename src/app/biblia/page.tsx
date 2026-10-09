import type { Metadata } from "next";
import Link from "next/link";
import { BookReadCount, ContinueReading } from "@/components/bible/reading-progress";
import { SectionTitle } from "@/components/ui";
import { BOOKS, type BibleBook } from "@/domain/bible/books";

export const metadata: Metadata = { title: "Bíblia" };

function groupByCategory(books: readonly BibleBook[]) {
  const groups = new Map<string, BibleBook[]>();
  for (const book of books) groups.set(book.category, [...(groups.get(book.category) ?? []), book]);
  return [...groups];
}

function Testament({ title, books }: { title: string; books: BibleBook[] }) {
  return (
    <section className="space-y-6">
      <SectionTitle eyebrow={`${books.length} livros`} title={title} />
      {groupByCategory(books).map(([category, list]) => (
        <div key={category}>
          <h3 className="mb-2 text-sm font-semibold text-muted">{category}</h3>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((book) => (
              <li key={book.id}>
                <Link
                  href={`/biblia/${book.slug}`}
                  className="flex h-full flex-col rounded-xl border border-line bg-surface px-3 py-2.5 transition hover:border-primary/50 hover:shadow-card"
                >
                  <span className="font-serif font-semibold">{book.name}</span>
                  <span className="text-xs text-muted">
                    <BookReadCount bookId={book.id} total={book.chapters} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

export default function BiblePage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-serif text-3xl font-semibold">Bíblia Sagrada</h1>
        <p className="mt-1 text-muted">Cada capítulo lido vale XP — e o primeiro de cada um vale um bônus.</p>
      </header>
      <ContinueReading />
      <Testament title="Antigo Testamento" books={BOOKS.filter((b) => b.testament === "old")} />
      <Testament title="Novo Testamento" books={BOOKS.filter((b) => b.testament === "new")} />
    </div>
  );
}
