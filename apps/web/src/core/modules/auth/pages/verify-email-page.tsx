"use client";

import { Mail, MailCheck, MailX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} from "src/core/modules/auth/utils/verify-email-state";
import { authClient } from "src/core/shared/utils/auth-client";

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const state = getVerifyEmailViewState(new URLSearchParams(searchParams));
  const [isResending, setIsResending] = useState(false);
  const verificationCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(window.location.origin)
      : "http://localhost:3000/auth/verify-email?status=success";

  async function handleResend() {
    if (!state.email) {
      toast.error("Email não encontrado. Volte para o cadastro.");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email: state.email,
        callbackURL: verificationCallbackURL,
      });

      if (error) {
        toast.error(error.message ?? "Erro ao reenviar email. Tente novamente.");
        return;
      }

      toast.success(`Email de verificação reenviado para ${state.email}.`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  const sharedLayout = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Company OS</h1>
      </div>
      <Card className="w-full max-w-[400px]">{children}</Card>
    </div>
  );

  if (state.kind === "success") {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)]">
            <MailCheck className="size-5 text-[var(--success)]" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
        </CardHeader>
        <CardContent className="pb-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  if (state.kind === "error") {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <MailX className="size-5 text-destructive" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
        </CardHeader>
        <CardContent className="pb-4">
          <Button asChild className="w-full">
            <Link href="/auth/login">Ir para login</Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <Mail className="size-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">{state.title}</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <p className="text-[13px] text-[var(--fg-secondary)]">
          Enviamos um link de verificação para{" "}
          {state.email ? (
            <span className="font-medium text-[var(--fg-primary)]">{state.email}</span>
          ) : (
            "seu email"
          )}
          . Clique no link para ativar sua conta.
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)]">
          Não encontrou? Verifique a pasta de spam ou reenvie abaixo.
        </p>
        <Button variant="outline" className="w-full" onClick={handleResend} disabled={isResending}>
          {isResending ? "Reenviando..." : "Reenviar email de verificação"}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
        <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </CardFooter>
    </>,
  );
}
