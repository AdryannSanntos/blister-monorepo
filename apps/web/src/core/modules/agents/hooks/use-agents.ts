"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type AgentStatus = "draft" | "active" | "archived";

export type AgentTool = "rag_search" | "file_search" | "web_research";

export type AgentVersion = {
  id: string;
  version: number;
  status: "draft" | "published" | "active" | "archived";
  flowDefinition: unknown;
  inputSchema: unknown;
  outputSchema: unknown;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Agent = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: AgentStatus;
  category: string;
  templateId: string | null;
  activeVersionId: string | null;
  allowedTools: AgentTool[];
  createdAt: string;
  updatedAt: string;
  onboardingCompletedAt: string | null;
  versions?: AgentVersion[];
};

export type CreateAgentInput = {
  name: string;
  slug: string;
  description?: string;
  category?: string;
  allowedTools?: AgentTool[];
};

export type UpdateAgentInput = {
  name?: string;
  description?: string;
  slug?: string;
  status?: AgentStatus;
  allowedTools?: AgentTool[];
};

export type FlowEdge = {
  sourceNodeId: string;
  sourcePortKey: string;
  targetNodeId: string;
  targetPortKey: string;
};

export type SaveDraftVersionInput = {
  flowDefinition: {
    config?: Record<string, unknown>;
    nodes: unknown[];
    edges?: FlowEdge[];
  };
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  notes?: string;
};

const agentsKey = (orgId: string) => ["agents", orgId] as const;
const agentKey = (orgId: string, agentId: string) =>
  ["agents", orgId, agentId] as const;

export function useCompanyAgents(orgId: string | null | undefined) {
  return useQuery({
    queryKey: agentsKey(orgId ?? ""),
    enabled: Boolean(orgId),
    queryFn: async () => {
      const { data } = await apiClient.get<Agent[]>(
        `/organizations/${orgId}/agents`,
      );
      return data;
    },
  });
}

export function useCompanyAgent(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: agentKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<Agent>(
        `/organizations/${orgId}/agents/${agentId}`,
      );
      return data;
    },
  });
}

export function useCreateAgent(orgId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAgentInput) => {
      if (!orgId) throw new Error("orgId required");
      const { data } = await apiClient.post<Agent>(
        `/organizations/${orgId}/agents`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: agentsKey(orgId) });
      toast.success("Agente criado.");
    },
    onError: () => toast.error("Erro ao criar agente."),
  });
}

export function useUpdateAgent(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpdateAgentInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.patch<Agent>(
        `/organizations/${orgId}/agents/${agentId}`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: agentsKey(orgId) });
        if (agentId) {
          queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
        }
      }
      toast.success("Agente atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar agente."),
  });
}

export function useArchiveAgent(orgId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!orgId) throw new Error("orgId required");
      const { data } = await apiClient.patch<Agent>(
        `/organizations/${orgId}/agents/${agentId}`,
        { status: "archived" },
      );
      return data;
    },
    onSuccess: (_data, agentId) => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: agentsKey(orgId) });
        queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
      }
      toast.success("Agente arquivado.");
    },
    onError: () => toast.error("Erro ao arquivar agente."),
  });
}

export function useReactivateAgent(orgId: string | null | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!orgId) throw new Error("orgId required");
      const { data } = await apiClient.post<Agent>(
        `/organizations/${orgId}/agents/${agentId}/reactivate`,
      );
      return data;
    },
    onSuccess: (_data, agentId) => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: agentsKey(orgId) });
        queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
      }
      toast.success("Agente reativado.");
    },
    onError: () => toast.error("Erro ao reativar agente."),
  });
}

export function useSaveDraftVersion(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveDraftVersionInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentVersion>(
        `/organizations/${orgId}/agents/${agentId}/versions/draft`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
      }
      toast.success("Rascunho salvo.");
    },
    onError: () => toast.error("Erro ao salvar rascunho."),
  });
}

export function usePublishVersion(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentVersion>(
        `/organizations/${orgId}/agents/${agentId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
      }
      toast.success("Versão publicada.");
    },
    onError: () => toast.error("Erro ao publicar versão."),
  });
}

export type CompleteOnboardingInput = {
  description?: string;
  instructions?: string;
  notes?: string;
  allowedTools?: AgentTool[];
  references?: Array<{
    sourceType: "brain_entry" | "asset" | "manual" | "web";
    sourceId: string;
    label?: string;
  }>;
  modelId?: string;
};

export function useCompleteAgentOnboarding(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CompleteOnboardingInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<Agent>(
        `/organizations/${orgId}/agents/${agentId}/onboarding/complete`,
        input,
      );
      return data;
    },
    onSuccess: (_data, _vars) => {
      if (orgId) {
        queryClient.invalidateQueries({ queryKey: ["agents", orgId] });
        if (agentId) {
          queryClient.invalidateQueries({ queryKey: ["agents", orgId, agentId] });
        }
      }
    },
    onError: () => toast.error("Erro ao concluir configuração do agente."),
  });
}

export function useActivateVersion(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentVersion>(
        `/organizations/${orgId}/agents/${agentId}/versions/${versionId}/activate`,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: agentKey(orgId, agentId) });
        queryClient.invalidateQueries({ queryKey: agentsKey(orgId) });
      }
      toast.success("Versão ativada.");
    },
    onError: () => toast.error("Erro ao ativar versão."),
  });
}
