"use client";

import { Edit2, Plus, Trash2, UserRound, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { TeamMember } from "@company-os/types";
import { MemberInviteDialog } from "src/core/modules/workspace/components/member-invite-dialog";
import { MemberRolesDialog } from "src/core/modules/workspace/components/member-roles-dialog";
import {
  useRemoveMember,
  useTeamMembers,
} from "src/core/modules/workspace/hooks/use-team";
import { useWorkspaceRoles } from "src/core/modules/workspace/hooks/use-roles";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { useAbility } from "src/core/shared/hooks/use-ability";
import { Avatar, AvatarFallback } from "src/core/shared/components/ui/avatar";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { ConfirmationDialog } from "src/core/shared/components/ui/confirmation-dialog";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";

function getInitials(name: string, email: string) {
  if (name.trim()) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function formatMemberDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function MemberRowActions({
  member,
  onEdit,
  onRemove,
}: {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
}) {
  const { can } = useAbility();
  const t = useTranslations("workspace.team");

  return (
    <TableRowActionsMenu
      ariaLabel={t("actionsMenu", { name: member.name })}
      items={[
        {
          id: "edit",
          label: t("editMember"),
          icon: Edit2,
          onClick: () => onEdit(member),
          hidden: !can("update", "Member"),
        },
        {
          id: "remove",
          label: t("removeMember"),
          icon: Trash2,
          onClick: () => onRemove(member),
          destructive: true,
          hidden: !can("delete", "Member"),
        },
      ]}
    />
  );
}

export function TeamPage() {
  const locale = useLocale();
  const t = useTranslations("workspace.team");
  const tRoles = useTranslations("workspace.permissions.systemRoles");
  const membersQuery = useTeamMembers();
  const rolesQuery = useWorkspaceRoles();
  const removeMember = useRemoveMember();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  const members = membersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const isLoading = membersQuery.isLoading || rolesQuery.isLoading;

  const getRoleLabel = (roleName: string, isSystem: boolean) =>
    isSystem
      ? tRoles(roleName as "owner" | "admin" | "member")
      : roleName;

  const columns: ColumnDef<TeamMember>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("columns.member"),
        meta: { label: t("columns.member") },
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="size-9">
              <AvatarFallback className="text-[12px]">
                {getInitials(row.original.name, row.original.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                {row.original.name}
              </p>
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                {row.original.email}
              </p>
            </div>
          </div>
        ),
      },
      {
        accessorKey: "roles",
        header: t("columns.roles"),
        meta: { label: t("columns.roles") },
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.length === 0 ? (
              <span className="text-[12px] text-[var(--fg-tertiary)]">—</span>
            ) : (
              row.original.roles.map((role) => (
                <Badge key={role.id} variant="secondary" className="text-[11px]">
                  {getRoleLabel(role.name, role.isSystem)}
                </Badge>
              ))
            )}
          </div>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("columns.joinedAt"),
        meta: { label: t("columns.joinedAt") },
        cell: ({ row }) => formatMemberDate(row.original.createdAt, locale),
      },
    ],
    [t, tRoles, locale],
  );

  const filters: DataTableFilter<TeamMember>[] = useMemo(
    () => [
      {
        id: "role",
        label: t("filters.role"),
        options: roles.map((role) => ({
          label: getRoleLabel(role.name, role.isSystem),
          value: role.id,
          predicate: (row) => row.roles.some((item) => item.id === role.id),
        })),
      },
    ],
    [roles, t, tRoles],
  );

  return (
    <PageLayout
      icon={Users}
      title={t("title")}
      description={t("description")}
      actions={
        <PermissionGate permission="member.invite">
          <Button onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" />
            {t("invite")}
          </Button>
        </PermissionGate>
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : (
        <DataTable
          columns={[
            ...columns,
            {
              id: "actions",
              header: "",
              enableSorting: false,
              enableHiding: false,
              cell: ({ row }) => (
                <MemberRowActions
                  member={row.original}
                  onEdit={setEditingMember}
                  onRemove={setMemberToRemove}
                />
              ),
            },
          ]}
          data={members}
          filters={filters}
          exportOptions={{
            fileName: "team-members",
            title: t("title"),
            columns: [
              {
                id: "name",
                label: t("columns.member"),
                value: (row) => row.name,
              },
              {
                id: "email",
                label: t("columns.email"),
                value: (row) => row.email,
              },
              {
                id: "roles",
                label: t("columns.roles"),
                value: (row) =>
                  row.roles
                    .map((role) => getRoleLabel(role.name, role.isSystem))
                    .join(", "),
              },
              {
                id: "joinedAt",
                label: t("columns.joinedAt"),
                value: (row) => formatMemberDate(row.createdAt, locale),
              },
            ],
          }}
          emptyState={{
            icon: UserRound,
            title: t("emptyTitle"),
            description: t("emptyDescription"),
            action: (
              <PermissionGate permission="member.invite">
                <Button onClick={() => setInviteOpen(true)}>
                  <Plus className="size-4" />
                  {t("invite")}
                </Button>
              </PermissionGate>
            ),
          }}
        />
      )}

      <MemberInviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        roles={roles}
      />

      <MemberRolesDialog
        member={editingMember}
        roles={roles}
        open={Boolean(editingMember)}
        onOpenChange={(open) => !open && setEditingMember(null)}
      />

      <ConfirmationDialog
        open={Boolean(memberToRemove)}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
        title={t("removeDialogTitle")}
        description={t("removeDialogDescription", {
          name: memberToRemove?.name ?? "",
          email: memberToRemove?.email ?? "",
        })}
        confirmLabel={removeMember.isPending ? t("removing") : t("remove")}
        pending={removeMember.isPending}
        destructive
        onConfirm={async () => {
          if (!memberToRemove) return;
          await removeMember.mutateAsync(memberToRemove.id);
          setMemberToRemove(null);
        }}
      />
    </PageLayout>
  );
}
