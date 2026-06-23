"use client";

import { Plus, Shield, Trash2, UserCog, UserLock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";

import {
  PlatformAdminStatCard,
  formatPlatformDate,
} from "./platform-admin-primitives";
import {
  type PlatformAdminAssignment,
  usePlatformAdmins,
  useRemovePlatformRole,
} from "../hooks/use-platform-admin";

type PlatformAdminsPanelProps = {
  onGrantAccess: () => void;
};

export function PlatformAdminsPanel({ onGrantAccess }: PlatformAdminsPanelProps) {
  const locale = useLocale();
  const t = useTranslations("platformAdmin.adminsPage");
  const tRoles = useTranslations("platformAdmin.roles");
  const [assignmentToRemove, setAssignmentToRemove] =
    useState<PlatformAdminAssignment | null>(null);
  const admins = usePlatformAdmins();
  const removeRole = useRemovePlatformRole();
  const rows = admins.data ?? [];
  const owners = rows.filter((item) => item.role === "platform_owner").length;
  const platformAdmins = rows.filter(
    (item) => item.role === "platform_admin",
  ).length;

  const columns: ColumnDef<PlatformAdminAssignment>[] = useMemo(
    () => [
      {
        accessorKey: "userId",
        header: t("user"),
        meta: { label: t("user") },
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              {row.original.userId}
            </p>
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              {t("assignmentId", { id: row.original.id })}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: t("role"),
        meta: { label: t("role") },
        cell: ({ row }) => (
          <Badge
            variant={row.original.role === "platform_owner" ? "warning" : "info"}
          >
            {tRoles(row.original.role)}
          </Badge>
        ),
      },
      {
        accessorKey: "assignedBy",
        header: t("grantedBy"),
        meta: { label: t("grantedBy") },
      },
      {
        accessorKey: "assignedAt",
        header: t("grantedAt"),
        meta: { label: t("grantedAt") },
        cell: ({ row }) => formatPlatformDate(row.original.assignedAt, locale),
      },
    ],
    [t, tRoles, locale],
  );

  const filters: DataTableFilter<PlatformAdminAssignment>[] = useMemo(
    () => [
      {
        id: "role",
        label: t("role"),
        options: [
          {
            label: tRoles("platform_owner"),
            value: "platform_owner",
            predicate: (row) => row.role === "platform_owner",
          },
          {
            label: tRoles("platform_admin"),
            value: "platform_admin",
            predicate: (row) => row.role === "platform_admin",
          },
        ],
      },
    ],
    [t, tRoles],
  );

  const tableColumns = useMemo<ColumnDef<PlatformAdminAssignment>[]>(
    () => [
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
            className="text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_12%,transparent)] hover:text-[var(--danger)]"
          >
            <Trash2 className="size-4" />
          </Button>
        ),
      },
    ],
    [columns],
  );

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <PlatformAdminStatCard
          label={t("assignments")}
          value={String(rows.length)}
          hint={t("assignmentsHint")}
          icon={Shield}
        />
        <PlatformAdminStatCard
          label={t("owners")}
          value={String(owners)}
          hint={t("ownersHint")}
          icon={UserLock}
        />
        <PlatformAdminStatCard
          label={t("admins")}
          value={String(platformAdmins)}
          hint={t("adminsHint")}
          icon={UserCog}
        />
      </div>

      <DataTable
        title={t("tableTitle")}
        icon={Shield}
        columns={tableColumns}
        data={rows}
        filters={filters}
        exportOptions={{
          fileName: "platform-admins",
          title: t("title"),
          columns: [
            { id: "userId", label: t("user"), value: (row) => row.userId },
            { id: "role", label: t("role"), value: (row) => row.role },
            {
              id: "assignedBy",
              label: t("grantedBy"),
              value: (row) => row.assignedBy,
            },
            {
              id: "assignedAt",
              label: t("grantedAt"),
              value: (row) => formatPlatformDate(row.assignedAt, locale),
            },
          ],
        }}
        bulkActions={[
          {
            id: "remove-selected",
            label: t("removeSelected"),
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
          title: t("emptyTitle"),
          description: t("emptyDescription"),
          action: (
            <Button onClick={onGrantAccess}>
              <Plus className="size-4" />
              {t("emptyAction")}
            </Button>
          ),
        }}
      />

      <ConfirmationDialog
        open={Boolean(assignmentToRemove)}
        onOpenChange={(isOpen) => !isOpen && setAssignmentToRemove(null)}
        title={t("removeDialogTitle")}
        description={t("removeDialogDescription", {
          userId: assignmentToRemove?.userId ?? "",
          role: assignmentToRemove?.role ?? "",
        })}
        confirmLabel={removeRole.isPending ? t("removing") : t("remove")}
        pending={removeRole.isPending}
        destructive
        onConfirm={async () => {
          if (!assignmentToRemove) return;
          await removeRole.mutateAsync(assignmentToRemove.id);
          setAssignmentToRemove(null);
        }}
      />
    </>
  );
}
