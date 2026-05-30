"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type CatalogProvider = {
  id: string;
  slug: string;
  name: string;
};

export type CatalogModel = {
  id: string;
  providerId: string;
  name: string;
  capabilityMetadata: Record<string, unknown>;
};

export type BuilderCatalog = {
  providers: CatalogProvider[];
  models: CatalogModel[];
};

const catalogKey = (orgId: string, kind: string) =>
  ["ai-builder-catalog", orgId, kind] as const;

export function useAgentBuilderCatalog(
  orgId: string | null | undefined,
  kind: "text" | "image" = "text",
) {
  return useQuery({
    queryKey: catalogKey(orgId ?? "", kind),
    enabled: Boolean(orgId),
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await apiClient.get<BuilderCatalog>(
        `/organizations/${orgId}/ai/builder-catalog?kind=${kind}`,
      );
      return data;
    },
  });
}

export function useUpdateAgentModel(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.patch<{ modelId: string }>(
        `/organizations/${orgId}/agents/${agentId}/model`,
        { modelId },
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: ["agents", orgId, agentId] });
      }
      toast.success("Modelo atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar modelo."),
  });
}
