"use client";

import { useQuery } from "@tanstack/react-query";
import type { CreditSummary } from "@company-os/types";
import { getActiveWorkspaceId } from "src/core/shared/utils/active-workspace";
import { apiClient } from "src/core/shared/utils/api-client";

export function useCredits() {
  const workspaceId = getActiveWorkspaceId();

  return useQuery<CreditSummary>({
    queryKey: ["credits", workspaceId ?? "default"],
    queryFn: async () => {
      const { data } = await apiClient.get<CreditSummary>("/company/credits");
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
