"use client";

import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Fragment, useMemo } from "react";
import type { WorkspaceRole } from "@company-os/types";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "src/core/shared/components/ui/table";
import { cn } from "src/core/shared/utils";

import { assignablePermissionGroups } from "../utils/permission-groups";

type PermissionMatrixProps = {
  roles: WorkspaceRole[];
  className?: string;
};

export function PermissionMatrix({ roles, className }: PermissionMatrixProps) {
  const t = useTranslations("workspace.permissions.matrix");
  const tGroups = useTranslations("workspace.permissions.groups");
  const tPermissions = useTranslations("workspace.permissions.keys");
  const tRoles = useTranslations("workspace.permissions.systemRoles");

  const roleLabels = useMemo(
    () =>
      roles.map((role) => ({
        id: role.id,
        label: role.isSystem
          ? tRoles(role.name as "owner" | "admin" | "member")
          : role.name,
        permissions: new Set(role.permissions),
        isSystem: role.isSystem,
      })),
    [roles, tRoles],
  );

  if (roles.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] text-[13px] text-[var(--fg-tertiary)]">
        {t("empty")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)]",
        className,
      )}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[220px] sticky left-0 z-10 bg-[var(--bg-base)]">
              {t("permission")}
            </TableHead>
            {roleLabels.map((role) => (
              <TableHead key={role.id} className="min-w-[120px] text-center">
                <div className="flex flex-col items-center gap-1">
                  <span>{role.label}</span>
                  {role.isSystem ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {t("system")}
                    </Badge>
                  ) : null}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {assignablePermissionGroups.map((group) => (
            <Fragment key={group.id}>
              <TableRow className="bg-[var(--bg-raised)]">
                <TableCell
                  colSpan={roleLabels.length + 1}
                  className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--fg-quaternary)]"
                >
                  {tGroups(group.id)}
                </TableCell>
              </TableRow>
              {group.permissions.map((permission) => (
                <TableRow key={permission}>
                  <TableCell className="sticky left-0 z-10 bg-[var(--bg-base)] text-[13px] text-[var(--fg-primary)]">
                    {tPermissions(permission)}
                  </TableCell>
                  {roleLabels.map((role) => {
                    const allowed = role.permissions.has(permission);
                    return (
                      <TableCell key={`${permission}-${role.id}`} className="text-center">
                        {allowed ? (
                          <Check
                            className="mx-auto size-4 text-[var(--success)]"
                            aria-label={t("allowed")}
                          />
                        ) : (
                          <X
                            className="mx-auto size-4 text-[var(--fg-quaternary)]"
                            aria-label={t("denied")}
                          />
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
