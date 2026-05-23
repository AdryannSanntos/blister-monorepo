"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type BuilderCatalogProvider = {
  id: string;
  slug: string;
  name: string;
};

export type BuilderCatalogModel = {
  id: string;
  providerId: string;
  name: string;
  capabilityMetadata: Record<string, unknown>;
};

export type BuilderCatalogResponse = {
  providers: BuilderCatalogProvider[];
  models: BuilderCatalogModel[];
};

const catalogKey = (
  orgId: string,
  kind: "text" | "image" | undefined,
) => ["org-ai-builder-catalog", orgId, kind ?? "all"] as const;

export function useOrgAIBuilderCatalog(
  orgId: string | null | undefined,
  kind?: "text" | "image",
) {
  return useQuery({
    queryKey: catalogKey(orgId ?? "", kind),
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data } = await apiClient.get<BuilderCatalogResponse>(
        `/organizations/${orgId}/ai/builder-catalog`,
        { params: kind ? { kind } : undefined },
      );
      return data;
    },
    staleTime: 60_000,
  });
}
