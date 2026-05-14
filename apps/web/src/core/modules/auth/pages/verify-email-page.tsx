"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
        toast.error(
          error.message ?? "Erro ao reenviar email. Tente novamente.",
        );
        return;
      }

      toast.success(`Email de verificação reenviado para ${state.email}.`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  if (state.kind === "success" || state.kind === "error") {
    const summary =
      state.email && state.kind === "success"
        ? `Conta verificada para ${state.email}.`
        : state.email
          ? `Tentativa de verificação para ${state.email}.`
          : null;

    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{state.title}</CardTitle>
            <CardDescription>{state.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {summary ? (
              <p className="text-sm text-[var(--fg-secondary)]">{summary}</p>
            ) : null}
            <Button asChild className="w-full">
              <Link href="/auth/login">Ir para login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{state.title}</CardTitle>
          <CardDescription>{state.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--fg-secondary)]">
            Enviamos um link de verificação para{" "}
            {state.email ? (
              <span className="font-medium text-[var(--fg-primary)]">
                {state.email}
              </span>
            ) : (
              "seu email"
            )}
            . Verifique sua caixa de entrada e clique no link para ativar sua
            conta.
          </p>
          <p className="text-sm text-[var(--fg-tertiary)]">
            Não encontrou o email? Verifique a pasta de spam ou reenvie o link
            abaixo.
          </p>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Reenviando..." : "Reenviar email"}
          </Button>
        </CardContent>
        <CardFooter className="justify-center">
          <Link
            href="/auth/login"
            className="text-sm text-[var(--fg-tertiary)] underline-offset-4 hover:underline"
          >
            Voltar para login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
