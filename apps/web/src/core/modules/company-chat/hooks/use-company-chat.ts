"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type CompanyChatResult = {
  threadId: string;
  message: { id: string; content: string; role: string };
  delegatedToAgentId?: string;
  delegatedExecutionId?: string;
  fallbackMode?: "context_agent";
  cards: Array<{ type: string; metadata?: Record<string, unknown> }>;
  responseTarget: "company_chat";
  contextSources: Array<{ sourceLabel: string; snippet: string; score: number }>;
};

export function useSendCompanyChatMessage(orgId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { content: string; threadId?: string }) => {
      const { data } = await apiClient.post<CompanyChatResult>(
        `/organizations/${orgId}/company-chat/messages`,
        payload,
      );
      return data;
    },
    onSuccess: async () => {
      if (orgId) {
        await queryClient.invalidateQueries({ queryKey: ["company-chat", orgId] });
        await queryClient.invalidateQueries({ queryKey: ["chat-threads", orgId] });
      }
    },
    onError: () => toast.error("Erro ao enviar mensagem."),
  });
}
