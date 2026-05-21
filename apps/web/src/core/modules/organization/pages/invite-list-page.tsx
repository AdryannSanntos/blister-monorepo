"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateInviteDialog } from "src/core/modules/organization/components/create-invite-dialog";
import { useAbility } from "src/core/modules/organization/hooks/use-ability";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import {
  useCancelInvitation,
  useInvitations,
} from "src/core/modules/organization/hooks/use-invitations";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
} from "src/core/shared/components/ui/card";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { authClient } from "src/core/shared/utils/auth-client";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "success" | "warning";
  }
> = {
  pending: { label: "Pendente", variant: "warning" },
  accepted: { label: "Aceito", variant: "success" },
  cancelled: { label: "Cancelado", variant: "secondary" },
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function InviteListPage() {
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { cannot, isLoading: abilityLoading } = useAbility();
  const { data: invitations, isLoading } = useInvitations(activeOrgId);
  const cancelMutation = useCancelInvitation(activeOrgId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!abilityLoading && cannot("read", "Member")) {
    return (
      <div className="flex h-40 items-center justify-center">
        <p className="text-[13px] text-[var(--fg-tertiary)]">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (!activeOrgId || !session?.user) return null;

  return (
    <PageLayout
      eyebrow="Workspace"
      title="Convites"
      description="Gerencie os convites enviados para o workspace. Acompanhe o status de cada convite e cancele quando necessário."
      actions={
        <Button onClick={() => setDialogOpen(true)}>
          <UserPlus />
          Convidar membro
        </Button>
      }
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={UserPlus}
                title="Nenhum convite enviado ainda"
                description="Os convites ajudam a trazer novas pessoas para o workspace com controle desde o primeiro acesso. Envie o primeiro para começar a montar a equipe."
                action={
                  <Button onClick={() => setDialogOpen(true)}>
                    <UserPlus />
                    Enviar primeiro convite
                  </Button>
                }
                compact
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="pr-6 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => {
                  const status = statusConfig[inv.status] ?? {
                    label: inv.status,
                    variant: "outline" as const,
                  };
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="pl-6 font-medium text-[var(--fg-primary)]">
                        {inv.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-[var(--fg-tertiary)]">
                        {formatDate(inv.expiresAt)}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {inv.status === "pending" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelMutation.mutate(inv.id)}
                            disabled={cancelMutation.isPending}
                          >
                            Cancelar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CreateInviteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        orgId={activeOrgId}
        inviterId={session.user.id}
      />
    </PageLayout>
  );
}
