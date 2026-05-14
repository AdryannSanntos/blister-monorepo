"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { useAcceptInvitation } from "src/core/modules/organization/hooks/use-invitations";
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

export function AcceptInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invitationId = searchParams.get("invitationId") ?? "";
  const orgId = searchParams.get("orgId") ?? "";
  const { data: session } = authClient.useSession();
  const { setActiveOrgId } = useActiveOrganization();
  const acceptMutation = useAcceptInvitation();
  const [accepted, setAccepted] = useState(false);
  const loginHref = `/auth/login?redirect=${encodeURIComponent(
    `/invite/accept?invitationId=${invitationId}&orgId=${orgId}`,
  )}`;

  if (!invitationId || !orgId) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Convite inválido</CardTitle>
            <CardDescription>
              Este link de convite é inválido ou está incompleto.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link
              href="/auth/login"
              className="text-sm text-[var(--fg-tertiary)] underline-offset-4 hover:underline"
            >
              Ir para login
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Faça login para continuar</CardTitle>
            <CardDescription>
              Você precisa estar autenticado para aceitar o convite.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Link
              href={loginHref}
              className="text-sm text-[var(--fg-primary)] underline-offset-4 hover:underline"
            >
              Fazer login
            </Link>
          </CardFooter>
        </Card>
      </div>
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
      setActiveOrgId(orgId);
      toast.success("Convite aceito! Redirecionando...");

      setTimeout(() => {
        router.push("/app");
      }, 1500);
    } catch {
      // error handled in hook
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {accepted ? "Convite aceito!" : "Aceitar convite"}
          </CardTitle>
          <CardDescription>
            {accepted
              ? "Você agora faz parte do workspace. Redirecionando..."
              : "Você foi convidado para participar de um workspace."}
          </CardDescription>
        </CardHeader>
        {!accepted && (
          <CardContent>
            <Button
              className="w-full"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? "Aceitando..." : "Aceitar convite"}
            </Button>
          </CardContent>
        )}
        <CardFooter className="justify-center">
          <Link
            href="/dashboard"
            className="text-sm text-[var(--fg-tertiary)] underline-offset-4 hover:underline"
          >
            Ir para o dashboard
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
