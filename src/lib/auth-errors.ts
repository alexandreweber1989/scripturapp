/** Supabase Auth error → message for the user, in Portuguese. Unknown codes get a generic message. */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada (veja também o spam).",
  user_already_exists: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  email_exists: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.",
  weak_password: "Senha fraca. Use pelo menos 8 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  email_address_invalid: "Este e-mail não parece válido.",
  validation_failed: "Confira os dados digitados.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde um pouco e tente de novo.",
  signup_disabled: "Novos cadastros estão temporariamente fechados.",
};

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined): string {
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  if (error?.status === 429) return MESSAGES.over_request_rate_limit;
  return "Não foi possível concluir agora. Verifique sua conexão e tente novamente.";
}

export interface PasswordStrength {
  /** 0 (empty) to 4 (strong). */
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  /** Meets the minimum the form enforces. */
  acceptable: boolean;
}

export const MIN_PASSWORD_LENGTH = 8;

export function passwordStrength(password: string): PasswordStrength {
  if (!password) return { score: 0, label: "", acceptable: false };
  if (password.length < MIN_PASSWORD_LENGTH) return { score: 1, label: `Mínimo de ${MIN_PASSWORD_LENGTH} caracteres`, acceptable: false };
  const variety = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(password)).length;
  if (variety >= 3 && password.length >= 12) return { score: 4, label: "Forte", acceptable: true };
  if (variety >= 2) return { score: 3, label: "Boa", acceptable: true };
  return { score: 2, label: "Razoável: misture letras e números", acceptable: true };
}

/** Only same-site relative paths are allowed as post-login destinations. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}
