"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import type {
  ChatAttachment,
  DisplayMessage,
  ThreadReplay,
} from "../lib/agent-chat-display-state";
import {
  applyConversationEvent,
  createStreamMessageState,
  type StreamMessageState,
} from "../lib/agent-chat-event-reducer";
import { drainSseBuffer } from "../lib/agent-chat-events";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const streamBaseUrl = `${apiBaseUrl}/api`;

export const replayKey = (orgId: string, agentId: string, threadId: string) =>
  ["agent-chat", orgId, agentId, "replay", threadId] as const;
export const threadsKey = (orgId: string, agentId: string) =>
  ["agent-chat", orgId, agentId, "threads"] as const;

export function useThreadReplay(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
  threadId: string | null | undefined,
) {
  return useQuery({
    queryKey: replayKey(orgId ?? "", agentId ?? "", threadId ?? ""),
    enabled: Boolean(orgId && agentId && threadId),
    queryFn: async () => {
      const { data } = await apiClient.get<ThreadReplay>(
        `/organizations/${orgId}/agents/${agentId}/chat/threads/${threadId}/replay`,
      );
      return data;
    },
  });
}

export type SendStreamInput = {
  threadId: string;
  content: string;
  attachments?: ChatAttachment[];
};

export type UseAgentChatStream = {
  send: (input: SendStreamInput) => Promise<void>;
  stop: () => void;
  isStreaming: boolean;
  streaming: StreamMessageState | null;
  pendingUser: DisplayMessage | null;
  error: string | null;
};

/**
 * SSE-first chat client. Opens a `text/event-stream` POST, folds the conversation
 * events into the in-flight assistant message via the shared reducer, and hands
 * back over to the persisted replay query once the turn completes (no polling).
 */
export function useAgentChatStream(
  orgId: string | null | undefined,
  agentId: string | null | undefined,
): UseAgentChatStream {
  const queryClient = useQueryClient();
  const [streaming, setStreaming] = useState<StreamMessageState | null>(null);
  const [pendingUser, setPendingUser] = useState<DisplayMessage | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (input: SendStreamInput) => {
      if (!orgId || !agentId) throw new Error("orgId and agentId required");

      setError(null);
      setPendingUser({
        id: `pending-user-${input.threadId}-${Date.now()}`,
        role: "user",
        content: input.content,
        status: "completed",
        isStreaming: false,
        errorMessage: null,
        citations: [],
        toolCalls: [],
        attachments: input.attachments ?? [],
        createdAt: new Date().toISOString(),
      });
      // Placeholder so the thinking bubble shows immediately.
      setStreaming(createStreamMessageState("pending-assistant"));
      setIsStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;
      let state: StreamMessageState | null = null;

      const ingest = (buffer: string) => {
        const { events, rest } = drainSseBuffer(buffer);
        for (const event of events) {
          state = applyConversationEvent(
            state ?? createStreamMessageState(event.messageId),
            event,
          );
          setStreaming(state);
        }
        return rest;
      };

      try {
        const response = await fetch(
          `${streamBaseUrl}/organizations/${orgId}/agents/${agentId}/chat/threads/${input.threadId}/messages/stream`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: input.content,
              attachments: input.attachments ?? [],
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok || !response.body) {
          throw new Error(
            `Stream request failed with status ${response.status}`,
          );
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          buffer = ingest(buffer);
        }
        // Flush any trailing frame missing its final blank line.
        ingest(`${buffer}\n\n`);
      } catch (err) {
        if (!controller.signal.aborted) {
          const message =
            err instanceof Error ? err.message : "Erro no streaming.";
          setError(message);
          toast.error("Erro ao gerar a resposta.");
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        // Pull the authoritative persisted state, THEN drop the live overlay so
        // there is no flicker / duplicate between live and replay.
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: replayKey(orgId, agentId, input.threadId),
          }),
          queryClient.invalidateQueries({
            queryKey: threadsKey(orgId, agentId),
          }),
        ]);
        setStreaming(null);
        setPendingUser(null);
      }
    },
    [orgId, agentId, queryClient],
  );

  return { send, stop, isStreaming, streaming, pendingUser, error };
}
