"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type AgentContextProfile = {
  id: string;
  agentId: string;
  instructions: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentContextFile = {
  id: string;
  profileId: string;
  filename: string;
  objectKey: string;
  publicUrl: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  status: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AgentContextReference = {
  id: string;
  profileId: string;
  sourceType: string;
  sourceId: string;
  label: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type CreateAgentContextFileInput = {
  filename: string;
  objectKey: string;
  publicUrl?: string;
  mimeType?: string;
  sizeBytes?: number;
  status?: string;
  metadata?: Record<string, unknown>;
};

export type CreateAgentContextReferenceInput = {
  sourceType: string;
  sourceId: string;
  label?: string;
  metadata?: Record<string, unknown>;
};

export type UpsertAgentContextProfileInput = {
  instructions?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
};

const contextProfileKey = (orgId: string, agentId: string) =>
  ["agent-context-profile", orgId, agentId] as const;

const contextFilesKey = (orgId: string, agentId: string) =>
  ["agent-context-files", orgId, agentId] as const;

const contextRefsKey = (orgId: string, agentId: string) =>
  ["agent-context-references", orgId, agentId] as const;

export function useAgentContextProfile(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: contextProfileKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentContextProfile>(
        `/organizations/${orgId}/agents/${agentId}/context/profile`,
      );
      return data;
    },
  });
}

export function useUpsertAgentContextProfile(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertAgentContextProfileInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.patch<AgentContextProfile>(
        `/organizations/${orgId}/agents/${agentId}/context/profile`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: contextProfileKey(orgId, agentId),
        });
      }
      toast.success("Contexto atualizado.");
    },
    onError: () => toast.error("Erro ao atualizar contexto."),
  });
}

export function useAgentContextFiles(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: contextFilesKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentContextFile[]>(
        `/organizations/${orgId}/agents/${agentId}/context/files`,
      );
      return data;
    },
  });
}

export function useCreateAgentContextFile(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAgentContextFileInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentContextFile>(
        `/organizations/${orgId}/agents/${agentId}/context/files`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: contextFilesKey(orgId, agentId),
        });
      }
      toast.success("Arquivo adicionado ao contexto.");
    },
    onError: () => toast.error("Erro ao adicionar arquivo."),
  });
}

export function useArchiveAgentContextFile(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (fileId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      await apiClient.delete(
        `/organizations/${orgId}/agents/${agentId}/context/files/${fileId}`,
      );
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: contextFilesKey(orgId, agentId),
        });
      }
      toast.success("Arquivo removido.");
    },
    onError: () => toast.error("Erro ao remover arquivo."),
  });
}

export function useAgentContextReferences(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: contextRefsKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<AgentContextReference[]>(
        `/organizations/${orgId}/agents/${agentId}/context/references`,
      );
      return data;
    },
  });
}

export function useCreateAgentContextReference(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateAgentContextReferenceInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<AgentContextReference>(
        `/organizations/${orgId}/agents/${agentId}/context/references`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: contextRefsKey(orgId, agentId),
        });
      }
      toast.success("Referência adicionada.");
    },
    onError: () => toast.error("Erro ao adicionar referência."),
  });
}

export function useRemoveAgentContextReference(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (referenceId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      await apiClient.delete(
        `/organizations/${orgId}/agents/${agentId}/context/references/${referenceId}`,
      );
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: contextRefsKey(orgId, agentId),
        });
      }
      toast.success("Referência removida.");
    },
    onError: () => toast.error("Erro ao remover referência."),
  });
}
