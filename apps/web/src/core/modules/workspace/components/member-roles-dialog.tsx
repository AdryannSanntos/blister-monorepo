"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import type { TeamMember, WorkspaceRole } from "@company-os/types";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";
import { PermissionGate } from "src/core/shared/components/permission-gate";

import {
  useAssignMemberRole,
  useRemoveMemberRole,
} from "../hooks/use-team";

type MemberRolesDialogProps = {
  member: TeamMember | null;
  roles: WorkspaceRole[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MemberRolesDialog({
  member,
  roles,
  open,
  onOpenChange,
}: MemberRolesDialogProps) {
  const assignRole = useAssignMemberRole();
  const removeRole = useRemoveMemberRole();
  const t = useTranslations("workspace.team.editDialog");
  const tRoles = useTranslations("workspace.permissions.systemRoles");
  const tCommon = useTranslations("common");

  const availableRoles = useMemo(() => {
    if (!member) return [];
    const assignedIds = new Set(member.roles.map((role) => role.id));
    return roles.filter((role) => !assignedIds.has(role.id));
  }, [member, roles]);

  const getRoleLabel = (roleName: string, isSystem: boolean) =>
    isSystem
      ? tRoles(roleName as "owner" | "admin" | "member")
      : roleName;

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
  };

  const handleAssignRole = async (roleId: string) => {
    if (!member) return;
    await assignRole.mutateAsync({ userId: member.id, roleId });
  };

  const handleRemoveRole = async (roleId: string) => {
    if (!member) return;
    await removeRole.mutateAsync({ userId: member.id, roleId });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="animate-in fade-in zoom-in-95 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        {member ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-[14px] font-medium text-[var(--fg-primary)]">
                {member.name}
              </p>
              <p className="text-[13px] text-[var(--fg-tertiary)]">
                {member.email}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[13px] font-medium text-[var(--fg-secondary)]">
                {t("currentRoles")}
              </p>
              {member.roles.length === 0 ? (
                <p className="text-[13px] text-[var(--fg-tertiary)]">
                  {t("noRoles")}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {member.roles.map((role) => (
                    <Badge
                      key={role.id}
                      variant="secondary"
                      className="gap-1 pr-1"
                    >
                      {getRoleLabel(role.name, role.isSystem)}
                      <PermissionGate permission="member.update">
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-[var(--bg-hover)]"
                          aria-label={t("removeRole", {
                            role: getRoleLabel(role.name, role.isSystem),
                          })}
                          onClick={() => void handleRemoveRole(role.id)}
                          disabled={removeRole.isPending}
                        >
                          <X className="size-3" />
                        </button>
                      </PermissionGate>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <PermissionGate permission="member.update">
              <div className="flex flex-col gap-2">
                <p className="text-[13px] font-medium text-[var(--fg-secondary)]">
                  {t("addRole")}
                </p>
                {availableRoles.length === 0 ? (
                  <p className="text-[13px] text-[var(--fg-tertiary)]">
                    {t("noRolesAvailable")}
                  </p>
                ) : (
                  <Select
                    value=""
                    onValueChange={(value) => {
                      if (value) void handleAssignRole(value);
                    }}
                  >
                    <SelectTrigger aria-label={t("addRole")}>
                      <SelectValue placeholder={t("addRolePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRoles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {getRoleLabel(role.name, role.isSystem)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </PermissionGate>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {tCommon("cancel")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
