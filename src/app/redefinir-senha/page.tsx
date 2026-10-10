import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <ResetPasswordForm />
    </PageTransition>
  );
}
