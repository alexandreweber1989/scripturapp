"use client";

import clsx from "clsx";
import { LoaderCircle, Send } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getCompanion } from "@/domain/companions";
import { useScriptura } from "@/lib/client/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { CompanionAvatar } from "../companion-avatar";
import { RichText } from "./rich-text";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "O que significa nascer de novo em João 3?",
  "Como posso começar a ler a Bíblia todos os dias?",
  "Quem foi Rute e o que aprendo com ela?",
  "Explique a parábola do filho pródigo.",
];

export function MentorChat() {
  const { mode, profile, record, refreshProgress } = useScriptura();
  const companion = getCompanion(profile.companionId);
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prefilled = useRef(false);

  // Accounts: resume the recent conversation.
  useEffect(() => {
    if (mode !== "account") return;
    void getBrowserSupabase()!
      .from("mentor_messages")
      .select("role, content")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data?.length) setMessages((current) => (current.length ? current : (data as Message[]).reverse()));
      });
  }, [mode]);

  useEffect(() => {
    const question = searchParams.get("pergunta");
    if (question && !prefilled.current) {
      prefilled.current = true;
      setInput(question.slice(0, 1500));
    }
  }, [searchParams]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    setInput("");
    const history: Message[] = [...messages, { role: "user", content: question }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companionId: companion.id, messages: history.slice(-20) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Não foi possível falar com o mentor agora.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: answer }]);
      }
      if (mode === "account") await refreshProgress();
      else await record({ type: "mentor_question", messageId: `${Date.now()}` });
    } catch (e) {
      setMessages(history.slice(0, -1));
      setInput(question);
      setError(e instanceof Error ? e.message : "Erro inesperado.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-12rem)] flex-col">
      <header className="mb-4 flex items-center gap-3">
        <CompanionAvatar id={companion.id} size={56} />
        <div>
          <h1 className="font-serif text-2xl font-semibold">{companion.name}</h1>
          <p className="text-sm text-muted">{companion.trait} · seu mentor de estudo</p>
        </div>
      </header>

      <div className="flex-1 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-4 rounded-2xl border border-line bg-surface p-5">
            <p>
              Olá! Eu sou {companion.name}. Pergunte o que quiser sobre a Bíblia — contexto, significado, aplicação para a sua vida.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-xl border border-line bg-bg px-3 py-2 text-left text-sm hover:border-primary/60">
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              As respostas são geradas por inteligência artificial a partir de uma perspectiva batista. Confira sempre nas Escrituras (Atos 17:11).
            </p>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={clsx(
                "max-w-[85%] rounded-2xl px-4 py-3",
                m.role === "user" ? "rounded-br-sm bg-primary text-primary-ink" : "rounded-bl-sm border border-line bg-surface",
              )}
            >
              {m.role === "assistant" ? (
                m.content ? (
                  <RichText text={m.content} />
                ) : (
                  <LoaderCircle className="size-5 animate-spin text-muted" aria-label="Pensando" />
                )
              ) : (
                <p className="whitespace-pre-wrap">{m.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mt-3 rounded-xl bg-danger-soft px-4 py-2 text-sm text-danger">
          {error}{" "}
          {error.includes("Entre") && (
            <Link href="/entrar" className="font-semibold underline">
              Entrar
            </Link>
          )}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="sticky bottom-20 mt-4 flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-card md:bottom-4"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder={`Pergunte a ${companion.name}…`}
          className="max-h-40 min-h-11 flex-1 resize-none bg-transparent px-3 py-2.5 outline-none"
          aria-label="Sua pergunta"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="grid size-11 place-items-center rounded-xl bg-primary text-primary-ink disabled:opacity-40"
          aria-label="Enviar"
        >
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}
        </button>
      </form>
    </div>
  );
}
