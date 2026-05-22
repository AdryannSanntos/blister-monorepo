"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type ChatThread = {
  id: string;
  organizationId: string;
  agentId?: string | null;
  scope: "company_chat" | "agent_chat";
  title?: string | null;
  parentThreadId?: string | null;
  branchedFromMessageId?: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessage = {
  id: string;
  threadId: string;
  agentRunId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: Record<string, unknown>;
  editedFromMessageId?: string | null;
  regeneratedFromMessageId?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
};

export type SendMessageResult = {
  message: ChatMessage;
  decision: { mode: "execution" | "conversational"; reason: string };
  run?: { id: string; status: string } | null;
};

export type BranchResult = {
  branchId: string;
  replacedMessageId: string;
  messageId: string;
};

function invalidateChat(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
  agentId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["chat-threads", orgId, agentId] }),
    queryClient.invalidateQueries({ queryKey: ["chat-messages", orgId] }),
  ]);
}

export function useChatThreads(
  orgId: string | null,
  agentId: string | null,
  scope?: "company_chat" | "agent_chat",
) {
  return useQuery<ChatThread[]>({
    queryKey: ["chat-threads", orgId, agentId, scope],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatThread[]>(
        agentId
          ? `/organizations/${orgId}/agents/${agentId}/chat/threads`
          : `/organizations/${orgId}/company-chat/threads`,
        { params: { scope } },
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useChatMessages(
  orgId: string | null,
  agentId: string | null,
  threadId: string | null,
) {
  return useQuery<ChatMessage[]>({
    queryKey: ["chat-messages", orgId, agentId, threadId],
    queryFn: async () => {
      const { data } = await apiClient.get<ChatMessage[]>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${threadId}/messages`,
      );
      return data;
    },
    enabled: Boolean(orgId && threadId),
  });
}

export function useCreateChatThread(orgId: string | null, agentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { title?: string }) => {
      const { data } = await apiClient.post<ChatThread>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads`,
        { ...payload, scope: "agent_chat", agentId },
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateChat(queryClient, orgId, agentId ?? undefined);
    },
    onError: () => toast.error("Erro ao criar conversa."),
  });
}

export function useSendChatMessage(orgId: string | null, agentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { threadId: string; content: string }) => {
      const { data } = await apiClient.post<SendMessageResult>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${payload.threadId}/messages`,
        { content: payload.content },
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateChat(queryClient, orgId, agentId ?? undefined);
    },
    onError: () => toast.error("Erro ao enviar mensagem."),
  });
}

export function useEditMessageAndBranch(orgId: string | null, agentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { threadId: string; messageId: string; content: string }) => {
      const { data } = await apiClient.post<BranchResult>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${payload.threadId}/branch`,
        { messageId: payload.messageId, content: payload.content },
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateChat(queryClient, orgId, agentId ?? undefined);
      toast.success("Branch criado.");
    },
    onError: () => toast.error("Erro ao criar branch."),
  });
}

export function useRegenerateMessage(orgId: string | null, agentId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { threadId: string; messageId: string }) => {
      const { data } = await apiClient.post<SendMessageResult>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${payload.threadId}/regenerate`,
        { messageId: payload.messageId },
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) await invalidateChat(queryClient, orgId, agentId ?? undefined);
      toast.success("Regeneração solicitada.");
    },
    onError: () => toast.error("Erro ao regenerar mensagem."),
  });
}
