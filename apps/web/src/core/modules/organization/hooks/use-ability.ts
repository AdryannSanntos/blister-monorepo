"use client";

import { useQuery } from "@tanstack/react-query";
import {
  type AppAbility,
  type AppAction,
  type AppPermissionKey,
  type AppSubject,
  type PermissionOverride,
  defineAbilityForPermissions,
} from "@company-os/authz";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";
import { apiClient } from "src/core/shared/utils/api-client";

type AbilityResponse = {
  permissions: AppPermissionKey[];
  overrides: PermissionOverride[];
};

export function useAbility() {
  const { activeOrgId } = useActiveOrganization();

  const { data, isLoading } = useQuery<AbilityResponse>({
    queryKey: ["ability", activeOrgId],
    queryFn: async () => {
      const { data } = await apiClient.get<AbilityResponse>(
        `/organizations/${activeOrgId}/me/ability`,
      );
      return data;
    },
    enabled: Boolean(activeOrgId),
    staleTime: 5 * 60 * 1000,
    select: (raw) => raw,
  });

  const ability: AppAbility | null = data
    ? defineAbilityForPermissions(data.permissions, data.overrides)
    : null;

  function can(action: AppAction, subject: AppSubject): boolean {
    if (!ability) return false;
    return ability.can(action, subject);
  }

  function cannot(action: AppAction, subject: AppSubject): boolean {
    if (!ability) return true;
    return ability.cannot(action, subject);
  }

  return { can, cannot, ability, isLoading };
}
