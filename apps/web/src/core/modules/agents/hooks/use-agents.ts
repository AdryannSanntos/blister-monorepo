"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import type { AgentFlowDefinition } from "../schemas/agent-flow-schema";

export type AgentVersion = {
  id: string;
  versionNumber: number;
  status: string;
  flowDefinition: AgentFlowDefinition;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  publishedAt?: string | null;
  createdAt: string;
};

export type CompanyAgent = {
  id: string;
  organizationId: string;
  templateId?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  status: string;
  activeVersionId?: string | null;
  createdAt: string;
  updatedAt: string;
  versions?: AgentVersion[];
};

export type AgentTemplate = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
};

function invalidateAgents(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["company-agents", orgId] }),
    queryClient.invalidateQueries({ queryKey: ["company-agent", orgId] }),
  ]);
}

export function useCompanyAgents(orgId: string | null) {
  return useQuery<CompanyAgent[]>({
    queryKey: ["company-agents", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyAgent[]>(
        `/organizations/${orgId}/agents`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useCompanyAgent(orgId: string | null, agentId: string | null) {
  return useQuery<CompanyAgent>({
    queryKey: ["company-agent", orgId, agentId],
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyAgent>(
        `/organizations/${orgId}/agents/${agentId}`,
      );
      return data;
    },
    enabled: Boolean(orgId && agentId),
  });
}

export function useCreateCompanyAgent(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<CompanyAgent>(
        `/organizations/${orgId}/agents`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Agente criado com sucesso.");
    },
    onError: () => toast.error("Erro ao criar agente."),
  });
}

export function useSaveAgentDraft(
  orgId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { data } = await apiClient.post<AgentVersion>(
        `/organizations/${orgId}/agents/${agentId}/versions/draft`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Draft salvo com sucesso.");
    },
    onError: () => toast.error("Erro ao salvar draft."),
  });
}

export function usePublishAgentVersion(
  orgId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await apiClient.post<AgentVersion>(
        `/organizations/${orgId}/agents/${agentId}/versions/${versionId}/publish`,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Versão publicada.");
    },
    onError: () => toast.error("Erro ao publicar versão."),
  });
}

export function useActivateAgentVersion(
  orgId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (versionId: string) => {
      const { data } = await apiClient.post<CompanyAgent>(
        `/organizations/${orgId}/agents/${agentId}/versions/${versionId}/activate`,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Versão ativada.");
    },
    onError: () => toast.error("Erro ao ativar versão."),
  });
}

export function useUpdateCompanyAgent(
  orgId: string | null,
  agentId: string | null,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name?: string;
      slug?: string;
      description?: string;
      status?: string;
    }) => {
      const { data } = await apiClient.patch<CompanyAgent>(
        `/organizations/${orgId}/agents/${agentId}`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Agente atualizado com sucesso.");
    },
    onError: () => toast.error("Erro ao atualizar agente."),
  });
}

export function useArchiveCompanyAgent(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (agentId: string) => {
      const { data } = await apiClient.patch<CompanyAgent>(
        `/organizations/${orgId}/agents/${agentId}`,
        { status: "archived" },
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateAgents(queryClient, orgId);
      toast.success("Agente arquivado com sucesso.");
    },
    onError: () => toast.error("Erro ao arquivar agente."),
  });
}

export type FlowType =
  | "analysis"
  | "copy"
  | "image"
  | "post"
  | "email";

export function resolveFlowAgent(
  agents: CompanyAgent[] | undefined,
  flowType: FlowType,
): CompanyAgent | null {
  if (!agents?.length) return null;
  const bySlug = agents.find(
    (a) =>
      a.slug.startsWith(`${flowType}-`) || a.slug === flowType,
  );
  if (bySlug) return bySlug;
  const byTemplate = agents.find(
    (a) => a.templateId?.includes(flowType),
  );
  if (byTemplate) return byTemplate;
  return agents.find((a) => a.status === "active") ?? agents[0];
}
