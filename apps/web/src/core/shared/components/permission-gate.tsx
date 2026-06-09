"use client";

import type { ReactNode } from "react";
import { type AppPermissionKey, permissionMap } from "@company-os/authz";
import { useAbility } from "src/core/shared/hooks/use-ability";

type PermissionGateProps = {
  permission: AppPermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
};

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { can, isLoading } = useAbility();

  if (isLoading) return null;

  const mapping = permissionMap[permission];
  if (!mapping) return null;

  const [action, subject] = mapping;

  if (can(action, subject)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}
