"use client";

import { useDashboardData } from "src/core/modules/dashboard/hooks/use-dashboard-data";
import { useWorkspaceContext } from "src/core/modules/workspaces/hooks/use-workspace-context";

export function useWorkspaceGreetingName() {
  const { data: workspaceContext, isLoading: isWorkspaceLoading } =
    useWorkspaceContext();
  const { displayName: userDisplayName, isLoading: isUserLoading } =
    useDashboardData();

  const activeCompanyId = workspaceContext?.active.companyId;

  const name =
    workspaceContext?.companies.find((company) => company.id === activeCompanyId)
      ?.name ?? userDisplayName;

  return {
    name,
    isLoading: isWorkspaceLoading || isUserLoading,
  };
}
