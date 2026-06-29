import type { PlatformAdminAssignment } from "src/core/modules/platform-admin/hooks/use-platform-admin";
import type { CompanyOption } from "src/core/modules/workspaces/hooks/use-workspace-context";
import {
  isPlatformAdminRole,
  pickDefaultOnboardedCompany,
} from "src/core/modules/workspaces/utils/pick-default-company";
import {
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "src/core/shared/utils/active-workspace";
import { apiClient } from "src/core/shared/utils/api-client";

export const getSafeRedirectPath = (value: string | null): string | null => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
};

export const resolvePostLoginNavigation = async (
  explicitRedirect: string | null,
): Promise<string> => {
  const safeExplicit = getSafeRedirectPath(explicitRedirect);

  try {
    const [{ data: roles }, { data: companies }, { data: home }] =
      await Promise.all([
        apiClient.get<PlatformAdminAssignment[]>("/platform/me/roles"),
        apiClient.get<CompanyOption[]>("/companies"),
        apiClient.get<{ destination: "onboarding" | "dashboard" }>(
          "/companies/home-destination",
        ),
      ]);

    const platformRoles = roles.map((assignment) => assignment.role);
    const defaultCompany = pickDefaultOnboardedCompany(
      companies,
      getActiveWorkspaceId(),
    );

    if (defaultCompany) {
      setActiveWorkspaceId(defaultCompany.id);
    }

    if (safeExplicit) return safeExplicit;

    if (isPlatformAdminRole(platformRoles)) return "/admin";
    if (home.destination === "onboarding") return "/onboarding";
    return "/dashboard";
  } catch {
    return safeExplicit ?? "/dashboard";
  }
};
