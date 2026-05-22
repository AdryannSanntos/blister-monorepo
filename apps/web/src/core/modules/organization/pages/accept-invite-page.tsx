"use client";

import { UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAcceptInvitation } from "src/core/modules/organization/hooks/use-invitations";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "src/core/shared/components/ui/card";
import { authClient } from "src/core/shared/utils/auth-client";

export function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") ?? "";
  const orgId = searchParams.get("orgId") ?? "";
  const { data: session } = authClient.useSession();
  const acceptMutation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);

  const loginHref = `/auth/login?redirect=${encodeURIComponent(
    `/invite/accept?invitationId=${invitationId}&orgId=${orgId}`,
  )}`;

  const sharedLayout = (children: React.ReactNode) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[var(--bg-canvas)] px-4">
      <div className="flex flex-col items-center gap-1 text-center">
        <div className="flex size-10 items-center justify-center rounded-[var(--r-md)] bg-primary text-primary-foreground text-lg font-semibold">
          C
        </div>
        <h1 className="mt-2 text-[15px] font-medium text-[var(--fg-primary)]">Workana AI</h1>
      </div>
      <Card className="w-full max-w-[420px]">{children}</Card>
    </div>
  );

  if (!invitationId || !orgId) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Convite inválido</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Este link de convite é inválido ou está incompleto.
          </p>
        </CardHeader>
        <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
          <Link href="/auth/login" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
            Ir para login
          </Link>
        </CardFooter>
      </>,
    );
  }

  if (!session?.user) {
    return sharedLayout(
      <>
        <CardHeader className="pb-4">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
            <UserCheck className="size-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Você foi convidado</h2>
          <p className="text-[13px] text-[var(--fg-tertiary)]">
            Faça login ou crie uma conta para aceitar o convite e entrar no workspace.
          </p>
        </CardHeader>
        <CardContent className="space-y-3 pb-4">
          <Button asChild className="w-full">
            <Link href={loginHref}>Fazer login</Link>
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={`/auth/signup?redirect=${encodeURIComponent(`/invite/accept?invitationId=${invitationId}&orgId=${orgId}`)}`}>
              Criar conta
            </Link>
          </Button>
        </CardContent>
      </>,
    );
  }

  async function handleAccept() {
    if (!session?.user?.id) return;
    try {
      await acceptMutation.mutateAsync({
        orgId,
        invitationId,
        userId: session.user.id,
      });
      setAccepted(true);
      toast.success("Convite aceito! Redirecionando...");
      setTimeout(() => router.push("/app"), 1500);
    } catch {
      // error handled in hook
    }
  }

  if (accepted) {
    return sharedLayout(
      <CardHeader className="pb-6">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--success)_15%,transparent)]">
          <UserCheck className="size-5 text-[var(--success)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Convite aceito!</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você agora faz parte do workspace. Redirecionando...
        </p>
      </CardHeader>,
    );
  }

  return sharedLayout(
    <>
      <CardHeader className="pb-4">
        <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-[var(--accent-soft)]">
          <UserCheck className="size-5 text-[var(--accent)]" />
        </div>
        <h2 className="text-[18px] font-medium text-[var(--fg-primary)]">Aceitar convite</h2>
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você foi convidado para entrar em um workspace do Workana AI.
        </p>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="mb-4 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-raised)] px-4 py-3 text-[13px] text-[var(--fg-secondary)]">
          Logado como <span className="font-medium text-[var(--fg-primary)]">{session.user.email}</span>
        </div>
        <Button className="w-full" onClick={handleAccept} disabled={acceptMutation.isPending}>
          {acceptMutation.isPending ? "Aceitando..." : "Aceitar convite"}
        </Button>
      </CardContent>
      <CardFooter className="justify-center border-t border-[var(--line-subtle)] py-4">
        <Link href="/dashboard" className="text-[13px] text-[var(--fg-tertiary)] underline-offset-4 hover:underline">
          Ir para o dashboard
        </Link>
      </CardFooter>
    </>,
  );
}
