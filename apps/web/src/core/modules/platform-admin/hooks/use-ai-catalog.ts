"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type AIProvider = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  status: "draft" | "active" | "disabled";
  iconMetadata: Record<string, unknown>;
  capabilityMetadata: Record<string, unknown>;
  pricingMetadata: Record<string, unknown>;
  limitsMetadata: Record<string, unknown>;
  schemaMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AIModel = {
  id: string;
  providerId: string;
  slug: string;
  name: string;
  description?: string | null;
  externalModelId: string;
  status: "draft" | "active" | "deprecated" | "disabled";
  capabilityMetadata: Record<string, unknown>;
  pricingMetadata: Record<string, unknown>;
  limitsMetadata: Record<string, unknown>;
  schemaMetadata: Record<string, unknown>;
  provider?: AIProvider;
  createdAt: string;
  updatedAt: string;
};

export type AIProviderPolicy = {
  id: string;
  organizationId: string;
  providerId: string;
  allowedModelIds: string[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

function invalidateCatalog(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["platform-ai-providers"] }),
    queryClient.invalidateQueries({ queryKey: ["platform-ai-models"] }),
    queryClient.invalidateQueries({ queryKey: ["platform-ai-policies"] }),
  ]);
}

export function useAIProviders() {
  return useQuery<AIProvider[]>({
    queryKey: ["platform-ai-providers"],
    queryFn: async () => {
      const { data } = await apiClient.get<AIProvider[]>(
        "/platform/ai/providers",
      );
      return data;
    },
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<AIProvider>(
        "/platform/ai/providers",
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateCatalog(queryClient);
      toast.success("Provider criado com sucesso.");
    },
    onError: () => toast.error("Erro ao criar provider."),
  });
}

export function useUpdateProvider() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      providerId,
      ...payload
    }: Record<string, unknown> & { providerId: string }) => {
      const { data } = await apiClient.patch<AIProvider>(
        `/platform/ai/providers/${providerId}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateCatalog(queryClient);
      toast.success("Provider atualizado com sucesso.");
    },
    onError: () => toast.error("Erro ao atualizar provider."),
  });
}

export function useAIModels(filters?: Record<string, string>) {
  return useQuery<AIModel[]>({
    queryKey: ["platform-ai-models", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<AIModel[]>("/platform/ai/models", {
        params: filters,
      });
      return data;
    },
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<AIModel>(
        "/platform/ai/models",
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateCatalog(queryClient);
      toast.success("Modelo criado com sucesso.");
    },
    onError: () => toast.error("Erro ao criar modelo."),
  });
}

export function useUpdateModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      modelId,
      ...payload
    }: Record<string, unknown> & { modelId: string }) => {
      const { data } = await apiClient.patch<AIModel>(
        `/platform/ai/models/${modelId}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateCatalog(queryClient);
      toast.success("Modelo atualizado com sucesso.");
    },
    onError: () => toast.error("Erro ao atualizar modelo."),
  });
}

export function useAIProviderPolicies(filters?: Record<string, string>) {
  return useQuery<AIProviderPolicy[]>({
    queryKey: ["platform-ai-policies", filters],
    queryFn: async () => {
      const { data } = await apiClient.get<AIProviderPolicy[]>(
        "/platform/ai/policies",
        { params: filters },
      );
      return data;
    },
  });
}

export function useUpsertPolicy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.put<AIProviderPolicy>(
        "/platform/ai/policies",
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await invalidateCatalog(queryClient);
      toast.success("Política atualizada com sucesso.");
    },
    onError: () => toast.error("Erro ao atualizar política."),
  });
}
