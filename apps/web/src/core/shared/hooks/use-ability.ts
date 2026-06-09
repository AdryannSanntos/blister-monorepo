"use client";

import { useQuery } from "@tanstack/react-query";
import type { AppPermissionKey, AppSubject } from "@company-os/authz";
import { defineAbilityForPermissions } from "@company-os/authz";
import { apiClient } from "src/core/shared/utils/api-client";
import { authClient } from "src/core/shared/utils/auth-client";

type UserPermissionsResponse = {
  permissions: AppPermissionKey[];
};

function useUserPermissions(userId: string | null | undefined) {
  return useQuery<AppPermissionKey[]>({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const { data } = await apiClient.get<UserPermissionsResponse>(
        "/users/me/permissions",
      );
      return data.permissions;
    },
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
}

export function useAbility() {
  const { data: session, isPending } = authClient.useSession();
  const userId = session?.user?.id ?? null;
  const { data: permissions, isLoading: isPermissionsLoading } =
    useUserPermissions(userId);

  const ability = defineAbilityForPermissions(permissions ?? []);

  function can(action: string, subject: AppSubject): boolean {
    return ability.can(action as Parameters<typeof ability.can>[0], subject);
  }

  return {
    can,
    ability,
    isLoading: isPending || isPermissionsLoading,
  };
}
