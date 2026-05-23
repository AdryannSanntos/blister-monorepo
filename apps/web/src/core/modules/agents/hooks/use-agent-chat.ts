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

export type ChatMessageRunSummary = {
  id: string;
  status: string;
  queuePosition: number | null;
  steps: Array<{
    id: string;
    blockType: string;
    status: string;
    inputPayload: unknown;
    outputPayload: unknown;
    errorMessage: string | null;
    createdAt: string;
  }>;
};

export type ChatAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size?: number;
  url?: string;
  textContent?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata: unknown;
  agentRunId: string | null;
  editedFromMessageId: string | null;
  regeneratedFromMessageId: string | null;
  createdAt: string;
  agentRun?: ChatMessageRunSummary | null;
};

const threadsKey = (orgId: string, agentId: string) =>
  ["agent-chat", orgId, agentId, "threads"] as const;
const messagesKey = (orgId: string, agentId: string, threadId: string) =>
  ["agent-chat", orgId, agentId, "messages", threadId] as const;

function hasActiveRun(messages: ChatMessage[] | undefined) {
  if (!messages || messages.length === 0) return false;
  const last = messages[messages.length - 1];
  const run = last.agentRun;
  if (!run) return false;
  return run.status === "queued" || run.status === "running";
}

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

export function useAgentMessages(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
  threadId: string | null | undefined,
) {
  return useQuery({
    queryKey: messagesKey(orgId ?? "", agentId ?? "", threadId ?? ""),
    enabled: Boolean(orgId && agentId && threadId),
    queryFn: async () => {
      const { data } = await apiClient.get<{ messages: ChatMessage[] }>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${threadId}/messages`,
      );
      return data.messages ?? [];
    },
    refetchInterval: (query) =>
      hasActiveRun(query.state.data as ChatMessage[] | undefined)
        ? 2000
        : false,
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
        {
          scope: "agent_chat",
          agentId,
          ...(title ? { title } : {}),
        },
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
          queryKey: messagesKey(orgId, agentId, threadId),
        });
      }
      toast.success("Conversa excluida.");
    },
    onError: () => toast.error("Erro ao excluir conversa."),
  });
}

export function useSendMessage(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      threadId: string;
      content: string;
      attachments?: ChatAttachment[];
    }) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<ChatMessage>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${input.threadId}/messages`,
        {
          content: input.content,
          attachments: input.attachments ?? [],
        },
      );
      return data;
    },
    onSuccess: (_data, input) => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: messagesKey(orgId, agentId, input.threadId),
        });
        queryClient.invalidateQueries({ queryKey: threadsKey(orgId, agentId) });
      }
    },
    onError: () => toast.error("Erro ao enviar mensagem."),
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
      const { data } = await apiClient.post<ChatThread>(
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

export function useRegenerateMessage(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { threadId: string; messageId: string }) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");
      const { data } = await apiClient.post<ChatMessage>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${input.threadId}/regenerate`,
        { messageId: input.messageId },
      );
      return data;
    },
    onSuccess: (_data, input) => {
      if (orgId && agentId) {
        queryClient.invalidateQueries({
          queryKey: messagesKey(orgId, agentId, input.threadId),
        });
      }
    },
    onError: () => toast.error("Erro ao regenerar resposta."),
  });
}
