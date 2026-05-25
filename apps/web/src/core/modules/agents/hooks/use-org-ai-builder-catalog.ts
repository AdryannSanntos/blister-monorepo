"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";
import { useActiveOrganization } from "src/core/modules/organization/hooks/use-active-organization";

export type CatalogProvider = {
  id: string;
  name: string;
};

export type CatalogModel = {
  id: string;
  name: string;
  providerId: string;
};

export type AiBuilderCatalog = {
  providers: CatalogProvider[];
  models: CatalogModel[];
};

export function useOrgAIBuilderCatalog(
  orgId: string | null | undefined,
  kind: "text" | "image" = "text",
) {
  const { activeOrgId } = useActiveOrganization();
  const resolvedOrgId = orgId ?? activeOrgId;

  return useQuery({
    queryKey: ["ai-builder-catalog", resolvedOrgId, kind],
    enabled: Boolean(resolvedOrgId),
    queryFn: async () => {
      const { data } = await apiClient.get<AiBuilderCatalog>(
        `/organizations/${resolvedOrgId}/ai-catalog`,
        { params: { kind } },
      );
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}
