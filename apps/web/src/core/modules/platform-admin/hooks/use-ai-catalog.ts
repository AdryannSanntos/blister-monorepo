"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AgentPolicy,
  AiModel,
  AiProvider,
  CreateAiModelDto,
  CreateAiProviderDto,
  PipelineAgentConfig,
  UpdatePipelineDto,
} from "@company-os/types";

import { apiClient } from "src/core/shared/utils/api-client";

import { usePlatformQueryEnabled } from "./use-platform-admin";

export function useAiProviders() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<AiProvider[]>({
    queryKey: ["platform", "ai", "providers"],
    queryFn: async () => {
      const { data } = await apiClient.get<AiProvider[]>(
        "/platform/ai/providers",
      );
      return data;
    },
    enabled,
  });
}

export function useCreateProvider() {
  const queryClient = useQueryClient();

  return useMutation<AiProvider, Error, CreateAiProviderDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<AiProvider>(
        "/platform/ai/providers",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "ai", "providers"] }),
  });
}

export function useAiModels() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<AiModel[]>({
    queryKey: ["platform", "ai", "models"],
    queryFn: async () => {
      const { data } = await apiClient.get<AiModel[]>("/platform/ai/models");
      return data;
    },
    enabled,
  });
}

export function useCreateModel() {
  const queryClient = useQueryClient();

  return useMutation<AiModel, Error, CreateAiModelDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<AiModel>(
        "/platform/ai/models",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "ai", "models"] }),
  });
}

export function useAgentPolicies() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<AgentPolicy[]>({
    queryKey: ["platform", "agents", "policies"],
    queryFn: async () => {
      const { data } = await apiClient.get<AgentPolicy[]>(
        "/platform/agents/policies",
      );
      return data;
    },
    enabled,
  });
}

export function usePipelineConfig() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<PipelineAgentConfig[]>({
    queryKey: ["platform", "agents", "pipeline"],
    queryFn: async () => {
      const { data } = await apiClient.get<PipelineAgentConfig[]>(
        "/platform/agents/pipeline",
      );
      return data;
    },
    enabled,
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation<PipelineAgentConfig[], Error, UpdatePipelineDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<PipelineAgentConfig[]>(
        "/platform/agents/pipeline",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["platform", "agents", "pipeline"],
      }),
  });
}
