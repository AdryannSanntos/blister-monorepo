"use client";

import { Edit2, KeyRound, Plus, Shield, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsStringLiteral, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import type { WorkspaceRole } from "@company-os/types";
import { PermissionMatrix } from "src/core/modules/workspace/components/permission-matrix";
import { RoleFormDialog } from "src/core/modules/workspace/components/role-form-dialog";
import {
  useDeleteRole,
  useWorkspaceRoles,
} from "src/core/modules/workspace/hooks/use-roles";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { useAbility } from "src/core/shared/hooks/use-ability";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "src/core/shared/components/ui/tabs";

const TAB_VALUES = ["roles", "matrix"] as const;

function RoleRowActions({
  role,
  onEdit,
  onDelete,
  deleteDisabled,
}: {
  role: WorkspaceRole;
  onEdit: (role: WorkspaceRole) => void;
  onDelete: (role: WorkspaceRole) => void;
  deleteDisabled: boolean;
}) {
  const { can } = useAbility();
  const t = useTranslations("workspace.permissions");

  if (role.isSystem) return null;

  return (
    <TableRowActionsMenu
      ariaLabel={t("actionsMenu", { name: role.name })}
      items={[
        {
          id: "edit",
          label: t("editRole"),
          icon: Edit2,
          onClick: () => onEdit(role),
          hidden: !can("update", "Role"),
        },
        {
          id: "delete",
          label: t("deleteRole"),
          icon: Trash2,
          onClick: () => onDelete(role),
          destructive: true,
          disabled: deleteDisabled,
          hidden: !can("delete", "Role"),
        },
      ]}
    />
  );
}

export function PermissionsPage() {
  const [tab, setTab] = useQueryState(
    "tab",
    parseAsStringLiteral(TAB_VALUES).withDefault("roles"),
  );
  const t = useTranslations("workspace.permissions");
  const tRoles = useTranslations("workspace.permissions.systemRoles");
  const rolesQuery = useWorkspaceRoles();
  const deleteRole = useDeleteRole();

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<WorkspaceRole | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<WorkspaceRole | null>(null);

  const roles = rolesQuery.data ?? [];

  const getRoleLabel = (role: WorkspaceRole) =>
    role.isSystem
      ? tRoles(role.name as "owner" | "admin" | "member")
      : role.name;

  const columns: ColumnDef<WorkspaceRole>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("columns.role"),
        meta: { label: t("columns.role") },
        cell: ({ row }) => (
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
              <Shield className="size-3.5 text-[var(--fg-tertiary)]" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[var(--fg-primary)]">
                {getRoleLabel(row.original)}
              </span>
              {row.original.isSystem ? (
                <Badge variant="secondary" className="text-[11px]">
                  {t("systemBadge")}
                </Badge>
              ) : null}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "memberCount",
        header: t("columns.members"),
        meta: { label: t("columns.members") },
        cell: ({ row }) => row.original.memberCount,
      },
      {
        accessorKey: "permissions",
        header: t("columns.permissions"),
        meta: { label: t("columns.permissions") },
        cell: ({ row }) => {
          const perms = row.original.permissions;
          const visible = perms.slice(0, 3);
          const overflow = perms.length - visible.length;
          return (
            <div className="flex flex-wrap gap-1">
              {visible.map((perm) => (
                <Badge key={perm} variant="secondary" className="text-[11px]">
                  {perm}
                </Badge>
              ))}
              {overflow > 0 ? (
                <Badge variant="secondary" className="text-[11px]">
                  +{overflow}
                </Badge>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, tRoles],
  );

  const handleOpenCreate = () => {
    setEditingRole(null);
    setFormOpen(true);
  };

  const handleOpenEdit = useCallback((role: WorkspaceRole) => {
    setEditingRole(role);
    setFormOpen(true);
  }, []);

  const tableColumns = useMemo<ColumnDef<WorkspaceRole>[]>(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => (
          <RoleRowActions
            role={row.original}
            onEdit={handleOpenEdit}
            onDelete={setRoleToDelete}
            deleteDisabled={deleteRole.isPending}
          />
        ),
      },
    ],
    [columns, deleteRole.isPending, handleOpenEdit],
  );

  return (
    <PageLayout
      icon={KeyRound}
      title={t("title")}
      description={t("description")}
      actions={
        <PermissionGate permission="role.create">
          <Button onClick={handleOpenCreate}>
            <Plus className="size-4" />
            {t("createRole")}
          </Button>
        </PermissionGate>
      }
    >
      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === "roles" || value === "matrix") {
            void setTab(value);
          }
        }}
        className="w-full"
      >
        <TabsList variant="pill" className="flex-wrap justify-start">
          <TabsTrigger value="roles">{t("tabs.roles")}</TabsTrigger>
          <TabsTrigger value="matrix">{t("tabs.matrix")}</TabsTrigger>
        </TabsList>

        {rolesQuery.isLoading ? (
          <div className="mt-6 flex flex-col gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            <TabsContent
              value="roles"
              className="mt-6 animate-in fade-in duration-200"
            >
              <DataTable
                title={t("tabs.roles")}
                icon={Shield}
                columns={tableColumns}
          data={roles}
          exportOptions={{
            fileName: "workspace-roles",
            title: t("title"),
            columns: [
              {
                id: "name",
                label: t("columns.role"),
                value: (row) => getRoleLabel(row),
              },
              {
                id: "members",
                label: t("columns.members"),
                value: (row) => row.memberCount,
              },
              {
                id: "permissions",
                label: t("columns.permissions"),
                value: (row) => row.permissions.join(", "),
              },
            ],
          }}
          emptyState={{
            icon: Shield,
            title: t("emptyTitle"),
            description: t("emptyDescription"),
            action: (
              <PermissionGate permission="role.create">
                <Button onClick={handleOpenCreate}>
                  <Plus className="size-4" />
                  {t("createRole")}
                </Button>
              </PermissionGate>
            ),
          }}
              />
            </TabsContent>
            <TabsContent
              value="matrix"
              className="mt-6 animate-in fade-in duration-200"
            >
              <SectionCard
                icon={Shield}
                title={t("matrix.sectionTitle")}
                description={t("matrix.sectionDescription")}
              >
                <PermissionMatrix roles={roles} className="border-0" />
              </SectionCard>
            </TabsContent>
          </>
        )}
      </Tabs>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        role={editingRole}
      />

      <ConfirmationDialog
        open={Boolean(roleToDelete)}
        onOpenChange={(open) => !open && setRoleToDelete(null)}
        title={t("deleteDialogTitle")}
        description={t("deleteDialogDescription", {
          name: roleToDelete ? getRoleLabel(roleToDelete) : "",
        })}
        confirmLabel={deleteRole.isPending ? t("deleting") : t("deleteConfirm")}
        pending={deleteRole.isPending}
        destructive
        onConfirm={async () => {
          if (!roleToDelete) return;
          await deleteRole.mutateAsync(roleToDelete.id);
          setRoleToDelete(null);
        }}
      />
    </PageLayout>
  );
}
