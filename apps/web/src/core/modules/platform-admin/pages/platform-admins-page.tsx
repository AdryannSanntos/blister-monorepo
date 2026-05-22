"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { AdminRoleDialog } from "../components/admin-role-dialog";
import {
  type PlatformAdminAssignment,
  usePlatformAdmins,
  useRemovePlatformRole,
} from "../hooks/use-platform-admin";

const columns: ColumnDef<PlatformAdminAssignment>[] = [
  { accessorKey: "userId", header: "User", meta: { label: "User" } },
  { accessorKey: "role", header: "Role", meta: { label: "Role" } },
  {
    accessorKey: "assignedBy",
    header: "Assigned by",
    meta: { label: "Assigned by" },
  },
  {
    accessorKey: "assignedAt",
    header: "Assigned at",
    meta: { label: "Assigned at" },
  },
];

export function PlatformAdminsPage() {
  const [open, setOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] =
    useState<PlatformAdminAssignment | null>(null);
  const admins = usePlatformAdmins();
  const removeRole = useRemovePlatformRole();

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Platform admins"
        description="Controle os usuários com acesso global ao admin operacional da plataforma."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Atribuir role
          </Button>
        }
      >
        <DataTable
          columns={[
            ...columns,
            {
              id: "actions",
              header: "",
              enableSorting: false,
              enableHiding: false,
              cell: ({ row }) => (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setAssignmentToRemove(row.original)}
                >
                  <Trash2 className="size-4" />
                </Button>
              ),
            },
          ]}
          data={admins.data ?? []}
          emptyState={{
            title: "Nenhum admin global",
            description:
              "Atribua a primeira role de plataforma para liberar a operação.",
          }}
        />
      </PageLayout>
      <ConfirmationDialog
        open={Boolean(assignmentToRemove)}
        onOpenChange={(open) => !open && setAssignmentToRemove(null)}
        title="Remover role global"
        description={
          <>
            O acesso global de <strong>{assignmentToRemove?.userId}</strong> como{" "}
            <strong>{assignmentToRemove?.role}</strong> será removido.
          </>
        }
        confirmLabel={removeRole.isPending ? "Removendo..." : "Remover role"}
        pending={removeRole.isPending}
        destructive
        onConfirm={async () => {
          if (!assignmentToRemove) return;
          await removeRole.mutateAsync(assignmentToRemove.id);
          setAssignmentToRemove(null);
        }}
      />
      <AdminRoleDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
