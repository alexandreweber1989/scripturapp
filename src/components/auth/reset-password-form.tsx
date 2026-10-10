"use client";

import clsx from "clsx";
import { Check, Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { MIN_PASSWORD_LENGTH, authErrorMessage, passwordStrength } from "@/lib/auth-errors";
import { useScriptura } from "@/lib/client/store";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { navigationTypes } from "@/lib/transitions";
import { Button, ButtonLink, Skeleton } from "../ui";

/** Reached from the password-reset e-mail: the callback already signed the user in with a recovery session. */
export function ResetPasswordForm() {
  const supabase = getBrowserSupabase();
  const { mode } = useScriptura();
  const router = useRouter();
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (mode === "loading") return <Skeleton className="mx-auto h-80 max-w-md" />;

  if (!supabase || mode !== "account") {
    return (
      <div className="glass mx-auto max-w-md space-y-4 rounded-3xl border border-line p-8 text-center shadow-card">
        <h1 className="font-display text-2xl font-extrabold">Link expirado</h1>
        <p className="text-muted">Para criar uma senha nova, abra o link mais recente que enviamos por e-mail ou peça outro.</p>
        <ButtonLink href="/entrar?modo=recuperar" className="min-h-11">
          Pedir novo link
        </ButtonLink>
      </div>
    );
  }

  const strength = passwordStrength(password);
  const matches = confirm.length > 0 && confirm === password;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!strength.acceptable) return setError(`A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    if (!matches) return setError("As duas senhas não são iguais.");
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) return setError(authErrorMessage(updateError));
    setDone(true);
  };

  if (done) {
    return (
      <div className="glass animate-rise mx-auto max-w-md space-y-4 rounded-3xl border border-line p-8 text-center shadow-card">
        <span className="bg-gradient-accent mx-auto grid size-16 place-items-center rounded-2xl text-white shadow-card">
          <Check className="size-8" />
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Senha atualizada</h1>
        <p className="text-muted">Pronto! Use a senha nova da próxima vez que entrar.</p>
        <Button onClick={() => router.push("/", { transitionTypes: navigationTypes(pathname, "/") })} className="min-h-11">
          Continuar estudando
        </Button>
      </div>
    );
  }

  const input = "min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base outline-none transition focus:border-primary focus:ring-4 focus:ring-primary-soft";
  return (
    <form onSubmit={submit} className="glass mx-auto max-w-md space-y-4 rounded-3xl border border-line p-8 shadow-card">
      <span className="bg-gradient-primary grid size-14 place-items-center rounded-2xl text-white shadow-card">
        <KeyRound className="size-7" />
      </span>
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Crie uma senha nova</h1>
        <p className="text-sm text-muted">Escolha uma senha que você não use em outros sites.</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Nova senha</span>
        <span className="relative block">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={MIN_PASSWORD_LENGTH}
            required
            className={clsx(input, "pr-12")}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 right-0 grid w-12 place-items-center text-muted hover:text-ink"
            aria-label={show ? "Ocultar senha" : "Mostrar senha"}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </span>
        <span className="block text-xs text-muted">{strength.label || `Use pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`}</span>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm font-semibold">Repita a senha</span>
        <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required className={input} />
        {confirm && !matches && <span className="block text-xs text-danger">As senhas ainda não são iguais.</span>}
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2.5 text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" className="min-h-12 w-full text-base" disabled={busy}>
        {busy && <LoaderCircle className="size-4 animate-spin" />}
        Salvar senha nova
      </Button>
    </form>
  );
}
