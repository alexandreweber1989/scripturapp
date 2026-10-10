import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";
import { PageTransition } from "@/components/page-transition";

export const metadata: Metadata = { title: "Entrar" };

export default function SignInPage() {
  return (
    <PageTransition>
      <Suspense>
        <AuthForm />
      </Suspense>
    </PageTransition>
  );
}
