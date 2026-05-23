"use client";

import { Plus, Shield, Trash2, UserCog, UserLock } from "lucide-react";
import { useState } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { AdminRoleDialog } from "../components/admin-role-dialog";
import {
  PlatformAdminStatCard,
  formatPlatformDate,
} from "../components/platform-admin-primitives";
import {
  type PlatformAdminAssignment,
  usePlatformAdmins,
  useRemovePlatformRole,
} from "../hooks/use-platform-admin";

const columns: ColumnDef<PlatformAdminAssignment>[] = [
  {
    accessorKey: "userId",
    header: "Usuario",
    meta: { label: "Usuario" },
    cell: ({ row }) => (
      <div>
        <p className="text-[13px] font-medium text-[var(--fg-primary)]">
          {row.original.userId}
        </p>
        <p className="text-[12px] text-[var(--fg-tertiary)]">
          Assignment {row.original.id}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: "Role",
    meta: { label: "Role" },
    cell: ({ row }) => (
      <Badge
        variant={row.original.role === "platform_owner" ? "warning" : "info"}
      >
        {row.original.role}
      </Badge>
    ),
  },
  {
    accessorKey: "assignedBy",
    header: "Concedido por",
    meta: { label: "Concedido por" },
  },
  {
    accessorKey: "assignedAt",
    header: "Concedido em",
    meta: { label: "Concedido em" },
    cell: ({ row }) => formatPlatformDate(row.original.assignedAt),
  },
];

const filters: DataTableFilter<PlatformAdminAssignment>[] = [
  {
    id: "role",
    label: "Role",
    options: [
      {
        label: "platform_owner",
        value: "platform_owner",
        predicate: (row) => row.role === "platform_owner",
      },
      {
        label: "platform_admin",
        value: "platform_admin",
        predicate: (row) => row.role === "platform_admin",
      },
    ],
  },
];

export function PlatformAdminsPage() {
  const [open, setOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] =
    useState<PlatformAdminAssignment | null>(null);
  const admins = usePlatformAdmins();
  const removeRole = useRemovePlatformRole();
  const rows = admins.data ?? [];
  const owners = rows.filter((item) => item.role === "platform_owner").length;
  const platformAdmins = rows.filter(
    (item) => item.role === "platform_admin",
  ).length;

  return (
    <>
      <PageLayout
        eyebrow="Conta"
        title="Admins globais"
        description="Gerencie quem consegue operar o admin central da plataforma. O ideal e manter esse grupo pequeno, auditavel e revisado com frequencia."
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" />
            Conceder acesso
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label="Assignments"
            value={String(rows.length)}
            hint="Quantidade total de acessos globais ativos no admin de plataforma."
            icon={Shield}
          />
          <PlatformAdminStatCard
            label="Owners"
            value={String(owners)}
            hint="Pessoas com controle maximo da camada global. Revise com rigor."
            icon={UserLock}
          />
          <PlatformAdminStatCard
            label="Admins"
            value={String(platformAdmins)}
            hint="Operadores com poder de gestao sem ownership da plataforma."
            icon={UserCog}
          />
        </div>

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
          data={rows}
          filters={filters}
          exportOptions={{
            fileName: "platform-admins",
            title: "Admins globais",
            columns: [
              { id: "userId", label: "Usuario", value: (row) => row.userId },
              { id: "role", label: "Role", value: (row) => row.role },
              {
                id: "assignedBy",
                label: "Concedido por",
                value: (row) => row.assignedBy,
              },
              {
                id: "assignedAt",
                label: "Concedido em",
                value: (row) => formatPlatformDate(row.assignedAt),
              },
            ],
          }}
          bulkActions={[
            {
              id: "remove-selected",
              label: "Remover selecionados",
              icon: Trash2,
              variant: "destructive",
              onClick: async (selectedRows) => {
                await Promise.all(
                  selectedRows.map((row) => removeRole.mutateAsync(row.id)),
                );
              },
            },
          ]}
          emptyState={{
            icon: Shield,
            title: "Nenhum admin global",
            description:
              "Atribua a primeira role de plataforma para liberar a operacao central da conta.",
            action: (
              <Button onClick={() => setOpen(true)}>
                <Plus className="size-4" />
                Conceder primeiro acesso
              </Button>
            ),
          }}
        />
      </PageLayout>
      <ConfirmationDialog
        open={Boolean(assignmentToRemove)}
        onOpenChange={(open) => !open && setAssignmentToRemove(null)}
        title="Remover role global"
        description={
          <>
            O acesso global de <strong>{assignmentToRemove?.userId}</strong>{" "}
            como <strong>{assignmentToRemove?.role}</strong> sera removido.
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
