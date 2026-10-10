"use client";

import clsx from "clsx";
import { LoaderCircle } from "lucide-react";
import Link from "@/components/transition-link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { Button, Card } from "../ui";

type Tab = "entrar" | "criar";

export function AuthForm() {
  const supabase = getBrowserSupabase();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<Tab>("entrar");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(
    searchParams.get("erro") ? { tone: "error", text: "O link expirou ou é inválido. Tente entrar novamente." } : null,
  );

  if (!supabase) {
    return (
      <Card className="mx-auto max-w-md space-y-3 text-center">
        <h1 className="font-display text-2xl font-bold">Contas em breve</h1>
        <p className="text-muted">
          Este ambiente ainda não tem o Supabase configurado. Você pode usar tudo no modo visitante — o progresso fica salvo neste aparelho.
        </p>
        <Link href="/" className="font-semibold text-primary">
          Voltar ao início
        </Link>
      </Card>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    if (tab === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) return setMessage({ tone: "error", text: "E-mail ou senha incorretos." });
      router.push("/");
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setBusy(false);
    if (error) return setMessage({ tone: "error", text: error.message });
    if (data.session) router.push("/");
    else setMessage({ tone: "info", text: "Quase lá! Enviamos um link de confirmação para o seu e-mail." });
  };

  return (
    <Card className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold">{tab === "entrar" ? "Bem-vindo de volta" : "Comece sua jornada"}</h1>
        <p className="mt-1 text-sm text-muted">Seu progresso, sequência e conquistas salvos na nuvem.</p>
      </div>
      <div className="grid grid-cols-2 rounded-xl bg-surface-2 p-1 text-sm font-semibold">
        {(["entrar", "criar"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx("rounded-lg py-2 transition", tab === t ? "bg-surface shadow-sm" : "text-muted")}
          >
            {t === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-3">
        {tab === "criar" && (
          <Field label="Como quer ser chamado?" value={name} onChange={setName} autoComplete="nickname" maxLength={60} />
        )}
        <Field label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required />
        <Field
          label="Senha"
          type="password"
          value={password}
          onChange={setPassword}
          autoComplete={tab === "entrar" ? "current-password" : "new-password"}
          minLength={8}
          required
        />
        {message && (
          <p className={clsx("rounded-xl px-3 py-2 text-sm", message.tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
            {message.text}
          </p>
        )}
        <Button type="submit" className="w-full py-3" disabled={busy}>
          {busy && <LoaderCircle className="size-4 animate-spin" />}
          {tab === "entrar" ? "Entrar" : "Criar conta"}
        </Button>
      </form>
    </Card>
  );
}

function Field({
  label,
  onChange,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange"> & { label: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 outline-none focus:border-primary"
      />
    </label>
  );
}
