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
import { authClient } from "src/core/shared/utils/auth-client";

export function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [isResending, setIsResending] = useState(false);
  const loginCallbackURL =
    typeof window !== "undefined"
      ? new URL("/auth/login", window.location.origin).toString()
      : "http://localhost:3000/auth/login";

  async function handleResend() {
    if (!email) {
      toast.error("Email não encontrado. Volte para o cadastro.");
      return;
    }

    setIsResending(true);
    try {
      const { error } = await authClient.sendVerificationEmail({
        email,
        callbackURL: loginCallbackURL,
      });

      if (error) {
        toast.error(
          error.message ?? "Erro ao reenviar email. Tente novamente.",
        );
        return;
      }

      toast.success(`Email de verificação reenviado para ${email}.`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifique seu email</CardTitle>
          <CardDescription>
            Acesse o link enviado para confirmar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[var(--fg-secondary)]">
            Enviamos um link de verificação para{" "}
            {email ? (
              <span className="font-medium text-[var(--fg-primary)]">
                {email}
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
