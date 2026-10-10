import Link from "@/components/transition-link";
import { Fragment, type ReactNode } from "react";
import { chapterHref } from "@/domain/bible/books";
import { findReferences } from "@/domain/bible/reference";

/** Turns scripture references inside a text run into links to the reader. */
function linkify(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  for (const match of findReferences(text)) {
    if (match.index > cursor) out.push(text.slice(cursor, match.index));
    out.push(
      <Link
        key={`${keyPrefix}-${match.index}`}
        href={chapterHref(match.reference.book, match.reference.chapter)}
        className="font-semibold text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
      >
        {match.text}
      </Link>,
    );
    cursor = match.index + match.text.length;
  }
  if (cursor < text.length) out.push(text.slice(cursor));
  return out;
}

/** Minimal inline markdown: **bold**, *italic*, then references. */
function inline(text: string, key: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g).flatMap((part, i): ReactNode[] => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return [<strong key={`${key}-${i}`}>{linkify(part.slice(2, -2), `${key}-${i}`)}</strong>];
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return [<em key={`${key}-${i}`}>{linkify(part.slice(1, -1), `${key}-${i}`)}</em>];
    }
    return linkify(part, `${key}-${i}`);
  });
}

/**
 * Renders the mentor's markdown as React elements. Deliberately small and
 * never uses innerHTML, so model output can't inject markup.
 */
export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list) return;
    const key = `list-${blocks.length}`;
    const items = list.items.map((item, i) => <li key={i}>{inline(item, `${key}-${i}`)}</li>);
    blocks.push(
      list.ordered ? (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = null;
  };

  text.split("\n").forEach((rawLine, i) => {
    const line = rawLine.trimEnd();
    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = !!numbered;
      if (list && list.ordered !== ordered) flushList();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      return;
    }
    flushList();
    if (!line.trim()) return;
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={i} className="font-display text-lg font-bold">
          {inline(heading[2], `h-${i}`)}
        </p>,
      );
      return;
    }
    if (line.startsWith(">")) {
      blocks.push(
        <blockquote key={i} className="border-l-4 border-gold/60 pl-3 font-scripture italic">
          {inline(line.replace(/^>\s?/, ""), `q-${i}`)}
        </blockquote>,
      );
      return;
    }
    blocks.push(<p key={i}>{inline(line, `p-${i}`)}</p>);
  });
  flushList();

  return <div className="space-y-3 leading-relaxed">{blocks.map((b, i) => <Fragment key={i}>{b}</Fragment>)}</div>;
}
