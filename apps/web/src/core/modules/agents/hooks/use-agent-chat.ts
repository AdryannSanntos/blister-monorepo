"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type ChatThread = {
  id: string;
  title: string | null;
  agentId: string | null;
  parentThreadId: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
};

export type ChatAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  url?: string;
  textContent?: string;
};

const threadsKey = (orgId: string, agentId: string) =>
  ["agent-chat", orgId, agentId, "threads"] as const;
const replayKey = (orgId: string, agentId: string, threadId: string) =>
  ["agent-chat", orgId, agentId, "replay", threadId] as const;

export function useAgentThreads(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  return useQuery({
    queryKey: threadsKey(orgId ?? "", agentId ?? ""),
    enabled: Boolean(orgId && agentId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ threads: ChatThread[] }>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads`,
      );
      return data.threads ?? [];
    },
  });
}

export function useCreateThread(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<ChatThread>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads`,
        { scope: "agent_chat", agentId, ...(title ? { title } : {}) },
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: threadsKey(orgId, agentId) });
      }
    },
    onError: () => toast.error("Erro ao criar conversa."),
  });
}

export function useDeleteThread(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (threadId: string) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      await apiClient.delete(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${threadId}`,
      );
      return threadId;
    },
    onSuccess: (threadId) => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: threadsKey(orgId, agentId) });
        queryClient.removeQueries({
          queryKey: replayKey(orgId, agentId, threadId),
        });
      }
      toast.success("Conversa excluida.");
    },
    onError: () => toast.error("Erro ao excluir conversa."),
  });
}

export function useEditAndBranch(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      threadId: string;
      messageId: string;
      content: string;
    }) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<{ branchId: string }>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${input.threadId}/branch`,
        { messageId: input.messageId, content: input.content },
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: threadsKey(orgId, agentId) });
      }
    },
    onError: () => toast.error("Erro ao editar mensagem."),
  });
}

export function useRenameThread(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { threadId: string; title: string }) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.patch<{ id: string; title: string }>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${input.threadId}`,
        { title: input.title },
      );
      return data;
    },
    onSuccess: () => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({ queryKey: threadsKey(orgId, agentId) });
      }
    },
    onError: () => toast.error("Erro ao renomear conversa."),
  });
}
