"use client";

import {
  type AppAbility,
  type AppAction,
  type AppPermissionKey,
  type AppSubject,
  defineAbilityForPermissions,
  type PermissionOverride,
} from "@company-os/authz";
import { useQuery } from "@tanstack/react-query";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { apiClient } from "src/core/shared/utils/api-client";
import { authClient } from "src/core/shared/utils/auth-client";

type AbilityResponse = {
  permissions: AppPermissionKey[];
  overrides: PermissionOverride[];
  isOwner?: boolean;
};

export function useAbility() {
  const { activeOrgId } = useActiveOrganization();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const sessionUserId = session?.user?.id;

  const { data, isLoading } = useQuery<AbilityResponse>({
    queryKey: ["ability", sessionUserId, activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get<AbilityResponse>(
        `/organizations/${activeOrgId}/me/ability`,
      );
      return data;
    },
    enabled: Boolean(activeOrgId && sessionUserId) && !isSessionPending,
    // Permissions are security-sensitive; always refetch on new mounts/focus.
    staleTime: 0,
    select: (raw) => raw,
  });

  const ability: AppAbility | null = data
    ? defineAbilityForPermissions(
        data.permissions,
        data.overrides,
        data.isOwner ?? false,
      )
    : null;

  function can(action: AppAction, subject: AppSubject): boolean {
    if (!ability) return false;
    return ability.can(action, subject);
  }

  function cannot(action: AppAction, subject: AppSubject): boolean {
    if (!ability) return true;
    return ability.cannot(action, subject);
  }

  return { can, cannot, ability, isLoading: isSessionPending || isLoading };
}
