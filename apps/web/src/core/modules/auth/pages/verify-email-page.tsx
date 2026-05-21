"use client";

import { ArrowLeft, Mail, MailCheck, MailX } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthBrandHeader } from "src/core/modules/auth/components/auth-brand-header";
import { AuthSplitLayout } from "src/core/modules/auth/components/auth-split-layout";
import {
  buildEmailVerificationCallbackURL,
  getVerifyEmailViewState,
} from "src/core/modules/auth/utils/verify-email-state";
import { Button } from "src/core/shared/components/ui/button";
import { authClient } from "src/core/shared/utils/auth-client";

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const state = getVerifyEmailViewState(new URLSearchParams(searchParams));
  const [isResending, setIsResending] = useState(false);
  const verificationCallbackURL =
    typeof window !== "undefined"
      ? buildEmailVerificationCallbackURL(window.location.origin, state.redirect)
      : "http://localhost:3000/auth/verify-email?status=success";

  const loginHref = state.redirect
    ? `/auth/login?redirect=${encodeURIComponent(state.redirect)}`
    : "/auth/login";

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

  if (state.kind === "success") {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)] mb-5">
          <MailCheck className="size-5 text-[var(--success)]" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">{state.title}</h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>

        <Button asChild className="w-full">
          <Link href={loginHref}>Ir para login</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  if (state.kind === "error") {
    return (
      <AuthSplitLayout>
        <AuthBrandHeader />

        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 mb-5">
          <MailX className="size-5 text-destructive" />
        </div>

        <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">{state.title}</h1>
        <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>

        <Button asChild className="w-full">
          <Link href={loginHref}>Ir para login</Link>
        </Button>
      </AuthSplitLayout>
    );
  }

  return (
    <AuthSplitLayout>
      <AuthBrandHeader />

      <div className="flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)] mb-5">
        <Mail className="size-5 text-[var(--accent)]" />
      </div>

      <h1 className="text-[22px] font-semibold text-[var(--fg-primary)]">{state.title}</h1>
      <p className="mt-1 mb-6 text-[13px] text-[var(--fg-tertiary)]">{state.description}</p>

      <p className="text-[13px] text-[var(--fg-secondary)] mb-1">
        Enviamos um link de verificação para{" "}
        {state.email ? (
          <span className="font-medium text-[var(--fg-primary)]">{state.email}</span>
        ) : (
          "seu email"
        )}
        . Clique no link para ativar sua conta.
      </p>
      <p className="text-[12px] text-[var(--fg-tertiary)] mb-6">
        Não encontrou? Verifique a pasta de spam ou reenvie abaixo.
      </p>

      <Button variant="outline" className="w-full mb-4" onClick={handleResend} disabled={isResending}>
        {isResending ? "Reenviando..." : "Reenviar email de verificação"}
      </Button>

      <Link
        href={loginHref}
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:text-[var(--fg-secondary)] hover:underline"
      >
        <ArrowLeft className="size-3.5" />
        Voltar para login
      </Link>
    </AuthSplitLayout>
  );
}
