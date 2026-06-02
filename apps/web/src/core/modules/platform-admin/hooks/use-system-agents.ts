"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import { usePlatformQueryEnabled } from "./use-platform-admin";

export type SystemAgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed";

export type SystemAgentModelConfig = {
  providerId?: string;
  modelId?: string;
  temperature?: number;
  maxOutputTokens?: number;
};

export type SystemAgentAdminView = {
  key: string;
  name: string;
  description: string;
  defaultModel: SystemAgentModelConfig | null;
  config: {
    providerId: string | null;
    modelId: string | null;
    temperature: number | null;
    maxOutputTokens: number | null;
    enabled: boolean;
  };
  sampleInput: unknown;
  updatedAt: string | null;
};

export type SystemAgentRunResult<T = unknown> = {
  agentKey: string;
  status: SystemAgentRunStatus;
  data: T | null;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type UpdateSystemAgentConfigInput = {
  key: string;
  providerId?: string | null;
  modelId?: string | null;
  temperature?: number | null;
  maxOutputTokens?: number | null;
  enabled?: boolean;
};

const systemAgentsKey = ["platform-system-agents"] as const;

export function useSystemAgents() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<SystemAgentAdminView[]>({
    queryKey: systemAgentsKey,
    queryFn: async () => {
      const { data } = await apiClient.get<SystemAgentAdminView[]>(
        "/platform/system-agents",
      );
      return data;
    },
    enabled,
  });
}

export function useUpdateSystemAgentConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ key, ...payload }: UpdateSystemAgentConfigInput) => {
      const { data } = await apiClient.patch<SystemAgentAdminView>(
        `/platform/system-agents/${key}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: systemAgentsKey });
      toast.success("Agente de sistema atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar agente de sistema."),
  });
}

export function useTestSystemAgent() {
  return useMutation({
    mutationFn: async ({
      key,
      input,
      organizationId,
    }: {
      key: string;
      input?: unknown;
      organizationId?: string;
    }) => {
      const { data } = await apiClient.post<SystemAgentRunResult>(
        `/platform/system-agents/${key}/test`,
        { input, organizationId },
      );
      return data;
    },
    onError: () => toast.error("Erro ao testar agente de sistema."),
  });
}
