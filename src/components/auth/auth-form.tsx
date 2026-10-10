"use client";

import clsx from "clsx";
import { ArrowLeft, Cloud, Eye, EyeOff, Flame, LoaderCircle, LockKeyhole, Mail, MailCheck, MessageCircle, User, Users } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import Link from "@/components/transition-link";
import { COMPANIONS } from "@/domain/companions";
import { MIN_PASSWORD_LENGTH, authErrorMessage, passwordStrength, safeNext } from "@/lib/auth-errors";
import { BRAND_MARK } from "@/lib/assets";
import { useScriptura } from "@/lib/client/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { navigationTypes } from "@/lib/transitions";
import { CompanionAvatar } from "../companion-avatar";
import { Button, ButtonLink, Skeleton } from "../ui";

type View = "entrar" | "criar" | "recuperar" | "enviado";
type Notice = { tone: "error" | "info"; text: string };

const BENEFITS = [
  { icon: Cloud, title: "Seu progresso em qualquer aparelho", text: "XP, nível, trilhas e relíquias salvos na nuvem." },
  { icon: Flame, title: "Ofensiva protegida", text: "Sua sequência de estudos continua no celular e no computador." },
  { icon: MessageCircle, title: "Mentor com IA", text: "Converse com seu companheiro sobre qualquer passagem." },
  { icon: Users, title: "Em breve: grupos da igreja", text: "Ligas semanais e trilhas em grupo com a sua célula." },
];

export function AuthForm() {
  const supabase = getBrowserSupabase();
  const { mode, email: signedInEmail, profile, signOut } = useScriptura();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const initialView: View = searchParams.get("modo") === "criar" ? "criar" : searchParams.get("modo") === "recuperar" ? "recuperar" : "entrar";
  const [view, setView] = useState<View>(initialView);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<{ email: string; reason: "confirmar" | "recuperar" } | null>(null);
  const [notice, setNotice] = useState<Notice | null>(
    searchParams.get("erro") ? { tone: "error", text: "O link expirou ou já foi usado. Peça um novo abaixo." } : null,
  );

  const go = (href: string) => router.push(href, { transitionTypes: navigationTypes(pathname, href) });
  const switchTo = (v: View) => {
    setView(v);
    setNotice(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setNotice(null);
    const address = email.trim();

    if (view === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({ email: address, password });
      setBusy(false);
      if (error) return setNotice({ tone: "error", text: authErrorMessage(error) });
      return go(next);
    }

    if (view === "recuperar") {
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      setBusy(false);
      if (error) return setNotice({ tone: "error", text: authErrorMessage(error) });
      setSentTo({ email: address, reason: "recuperar" });
      return setView("enviado");
    }

    if (!passwordStrength(password).acceptable) {
      setBusy(false);
      return setNotice({ tone: "error", text: `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.` });
    }
    const { data, error } = await supabase.auth.signUp({
      email: address,
      password,
      options: {
        data: { display_name: name.trim() || undefined },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setBusy(false);
    if (error) return setNotice({ tone: "error", text: authErrorMessage(error) });
    if (data.session) return go(next);
    setSentTo({ email: address, reason: "confirmar" });
    setView("enviado");
  };

  return (
    <div className="mx-auto grid max-w-5xl items-stretch gap-6 lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <section className="glass relative flex flex-col justify-center rounded-3xl border border-line p-6 shadow-card sm:p-8">
        {!supabase ? (
          <Unavailable />
        ) : mode === "loading" ? (
          <Skeleton className="h-80" />
        ) : mode === "account" ? (
          <SignedIn name={profile.displayName} email={signedInEmail} onContinue={() => go(next)} onSignOut={signOut} />
        ) : view === "enviado" && sentTo ? (
          <Sent sentTo={sentTo} onBack={() => switchTo("entrar")} />
        ) : (
          <>
            {view === "recuperar" ? (
              <div className="mb-6 space-y-1">
                <button
                  type="button"
                  onClick={() => switchTo("entrar")}
                  className="-ml-2 mb-2 flex min-h-11 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-muted hover:text-ink"
                >
                  <ArrowLeft className="size-4" /> Voltar
                </button>
                <h1 className="font-display text-3xl font-extrabold tracking-tight">Recuperar senha</h1>
                <p className="text-sm text-muted">Enviaremos um link para você criar uma senha nova.</p>
              </div>
            ) : (
              <>
                <div className="mb-5 space-y-1">
                  <h1 className="font-display text-3xl font-extrabold tracking-tight">{view === "entrar" ? "Bem-vindo de volta" : "Comece sua jornada"}</h1>
                  <p className="text-sm text-muted">
                    {view === "entrar" ? "Entre para continuar de onde parou." : "Crie sua conta grátis e guarde cada passo da sua caminhada."}
                  </p>
                </div>
                <div role="tablist" aria-label="Acesso" className="relative mb-6 grid grid-cols-2 rounded-2xl bg-surface-2 p-1 text-sm font-bold">
                  <span
                    aria-hidden
                    className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-surface shadow-card transition-transform duration-300 ease-[cubic-bezier(0.34,1.36,0.64,1)] motion-reduce:transition-none"
                    style={{ transform: view === "criar" ? "translateX(100%)" : "none" }}
                  />
                  {(["entrar", "criar"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      role="tab"
                      aria-selected={view === t}
                      onClick={() => switchTo(t)}
                      className={clsx("relative min-h-11 rounded-xl transition-colors", view === t ? "text-ink" : "text-muted hover:text-ink")}
                    >
                      {t === "entrar" ? "Entrar" : "Criar conta"}
                    </button>
                  ))}
                </div>
              </>
            )}

            <form onSubmit={submit} className="space-y-4">
              {view === "criar" && (
                <Field icon={User} label="Como quer ser chamado?" value={name} onChange={setName} autoComplete="nickname" maxLength={60} placeholder="Seu nome" />
              )}
              <Field icon={Mail} label="E-mail" type="email" value={email} onChange={setEmail} autoComplete="email" required placeholder="voce@email.com" />
              {view !== "recuperar" && (
                <div className="space-y-2">
                  <Field
                    icon={LockKeyhole}
                    label="Senha"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    autoComplete={view === "entrar" ? "current-password" : "new-password"}
                    minLength={view === "criar" ? MIN_PASSWORD_LENGTH : undefined}
                    required
                    trailing={
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="grid size-11 place-items-center rounded-xl text-muted hover:text-ink"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                      >
                        {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                      </button>
                    }
                  />
                  {view === "criar" && <StrengthMeter password={password} />}
                  {view === "entrar" && (
                    <button type="button" onClick={() => switchTo("recuperar")} className="min-h-11 text-sm font-semibold text-primary hover:underline">
                      Esqueci minha senha
                    </button>
                  )}
                </div>
              )}

              {notice && (
                <p role="alert" className={clsx("rounded-xl px-3 py-2.5 text-sm", notice.tone === "error" ? "bg-danger-soft text-danger" : "bg-success-soft text-success")}>
                  {notice.text}
                </p>
              )}

              <Button type="submit" className="min-h-12 w-full text-base" disabled={busy}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {view === "entrar" ? "Entrar" : view === "criar" ? "Criar conta grátis" : "Enviar link"}
              </Button>
            </form>

            <p className="mt-6 text-center text-xs text-muted">
              Prefere explorar antes?{" "}
              <Link href="/" className="font-semibold text-primary hover:underline">
                Continue como visitante
              </Link>
              . Seu progresso fica salvo neste aparelho.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function BrandPanel() {
  return (
    <section className="relative isolate hidden overflow-hidden rounded-3xl p-8 text-white shadow-card lg:flex lg:flex-col lg:justify-between">
      <div className="bg-gradient-primary absolute inset-0 -z-20" />
      <div className="absolute -right-24 -top-24 -z-10 size-80 rounded-full bg-white/15 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 -left-16 -z-10 size-80 rounded-full bg-[hsl(38_90%_55%/0.35)] blur-3xl" aria-hidden />
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Image src={BRAND_MARK} alt="" width={48} height={48} className="size-12 rounded-2xl shadow-card" />
          <span className="font-display text-2xl font-extrabold tracking-tight">Scriptura</span>
        </div>
        <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight">Sua jornada pelas Escrituras, guardada passo a passo.</h2>
        <ul className="space-y-4">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 backdrop-blur">
                <Icon className="size-5" />
              </span>
              <span>
                <span className="block font-bold">{title}</span>
                <span className="block text-sm text-white/80">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-8 flex items-end gap-1">
        {COMPANIONS.map((c, i) => (
          <CompanionAvatar key={c.id} id={c.id} size={64} className="animate-float drop-shadow-lg" style={{ animationDelay: `${i * 0.35}s` }} />
        ))}
      </div>
    </section>
  );
}

function StrengthMeter({ password }: { password: string }) {
  const { score, label } = passwordStrength(password);
  const tone = ["bg-line", "bg-danger", "bg-gold-bright", "bg-primary", "bg-success"][score];
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="grid grid-cols-4 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={clsx("h-1.5 rounded-full transition-colors", i <= score ? tone : "bg-surface-2")} />
        ))}
      </div>
      <p className="text-xs text-muted">{label || `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}</p>
    </div>
  );
}

function Sent({ sentTo, onBack }: { sentTo: { email: string; reason: "confirmar" | "recuperar" }; onBack: () => void }) {
  return (
    <div className="animate-rise space-y-4 text-center">
      <span className="bg-gradient-accent mx-auto grid size-16 place-items-center rounded-2xl text-white shadow-card">
        <MailCheck className="size-8" />
      </span>
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Confira seu e‑mail</h1>
      <p className="text-muted">
        {sentTo.reason === "confirmar" ? "Enviamos um link de confirmação para" : "Se existir uma conta com este e-mail, enviamos um link para"}{" "}
        <strong className="text-ink">{sentTo.email}</strong>.
        {sentTo.reason === "confirmar" ? " Abra-o para ativar sua conta." : " Abra-o para criar uma senha nova."}
      </p>
      <p className="text-sm text-muted">Não chegou? Veja a caixa de spam ou promoções. O link vale por 1 hora.</p>
      <Button variant="secondary" onClick={onBack} className="min-h-11">
        <ArrowLeft className="size-4" /> Voltar para entrar
      </Button>
    </div>
  );
}

function SignedIn({ name, email, onContinue, onSignOut }: { name: string; email: string | null; onContinue: () => void; onSignOut: () => Promise<void> }) {
  return (
    <div className="space-y-4 text-center">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Você já está conectado</h1>
      <p className="text-muted">
        Olá, <strong className="text-ink">{name}</strong>
        {email && <> ({email})</>}. Seu progresso está salvo na nuvem.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={onContinue} className="min-h-11">
          Continuar
        </Button>
        <Button variant="secondary" onClick={() => void onSignOut()} className="min-h-11">
          Sair da conta
        </Button>
      </div>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="space-y-3 text-center">
      <h1 className="font-display text-2xl font-bold">Contas em breve</h1>
      <p className="text-muted">Este ambiente ainda não tem contas configuradas. Use tudo no modo visitante: o progresso fica salvo neste aparelho.</p>
      <ButtonLink href="/" variant="secondary" className="min-h-11">
        Voltar ao início
      </ButtonLink>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  onChange,
  trailing,
  ...props
}: Omit<React.ComponentProps<"input">, "onChange"> & {
  icon: typeof Mail;
  label: string;
  onChange: (value: string) => void;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <span className="flex items-center rounded-xl border border-line bg-bg transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-soft">
        <Icon className="ml-3 size-5 shrink-0 text-muted" aria-hidden />
        <input
          {...props}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-12 w-full min-w-0 bg-transparent px-3 text-base outline-none placeholder:text-muted/70"
        />
        {trailing}
      </span>
    </label>
  );
}
