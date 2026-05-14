"use client";

import { UserPlus } from "lucide-react";
import { useState } from "react";
import { CreateInviteDialog } from "src/core/modules/organization/components/create-invite-dialog";
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
  CardHeader,
} from "src/core/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import { authClient } from "src/core/shared/utils/auth-client";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "success" | "warning" }
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
  const { data: invitations, isLoading } = useInvitations(activeOrgId);
  const cancelMutation = useCancelInvitation(activeOrgId);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!activeOrgId || !session?.user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-[var(--line-subtle)] px-6 py-4">
          <div>
            <h2 className="text-[15px] font-medium text-[var(--fg-primary)]">Convites</h2>
            <p className="mt-0.5 text-[12.5px] text-[var(--fg-tertiary)]">
              Gerencie os convites enviados para o seu workspace.
            </p>
          </div>
          <Button size="md" onClick={() => setDialogOpen(true)}>
            <UserPlus />
            Convidar membro
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--bg-raised)]">
                <UserPlus className="size-5 text-[var(--fg-quaternary)]" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                  Nenhum convite enviado ainda
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--fg-tertiary)]">
                  Convide membros para colaborar no workspace.
                </p>
              </div>
              <Button variant="outline" size="md" onClick={() => setDialogOpen(true)}>
                <UserPlus />
                Enviar primeiro convite
              </Button>
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
                  const status = statusConfig[inv.status] ?? { label: inv.status, variant: "outline" as const };
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
    </div>
  );
}
