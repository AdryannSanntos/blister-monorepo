"use client";

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
  CardDescription,
  CardHeader,
  CardTitle,
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

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceito",
  cancelled: "Cancelado",
};

const statusVariants: Record<string, "default" | "secondary" | "outline"> = {
  pending: "default",
  accepted: "secondary",
  cancelled: "outline",
};

export function InviteListPage() {
  const { data: session } = authClient.useSession();
  const { activeOrgId } = useActiveOrganization();
  const { data: invitations, isLoading } = useInvitations(activeOrgId);
  const cancelMutation = useCancelInvitation(activeOrgId);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleCancel(invitationId: string) {
    cancelMutation.mutate(invitationId);
  }

  if (!activeOrgId || !session?.user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Convites</CardTitle>
            <CardDescription>
              Gerencie os convites enviados para o seu workspace.
            </CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)}>Novo convite</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : !invitations || invitations.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--fg-tertiary)]">
              Nenhum convite enviado ainda.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariants[inv.status] ?? "outline"}>
                        {statusLabels[inv.status] ?? inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(inv.expiresAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell className="text-right">
                      {inv.status === "pending" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCancel(inv.id)}
                          disabled={cancelMutation.isPending}
                        >
                          Cancelar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
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
