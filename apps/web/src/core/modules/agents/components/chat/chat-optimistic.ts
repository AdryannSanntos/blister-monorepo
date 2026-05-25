import type { ChatMessage } from "src/core/modules/agents/hooks/use-agent-chat";

const OPTIMISTIC_PREFIX = "optimistic-";

export function buildOptimisticUserMessage(
  content: string,
  attachments?: unknown[],
): ChatMessage {
  return {
    id: `${OPTIMISTIC_PREFIX}user-${Date.now()}`,
    role: "user",
    content,
    metadata: { attachments: attachments ?? [] },
    agentRunId: null,
    editedFromMessageId: null,
    regeneratedFromMessageId: null,
    createdAt: new Date().toISOString(),
    agentRun: null,
  };
}

export function buildOptimisticAssistantMessage(): ChatMessage {
  return {
    id: `${OPTIMISTIC_PREFIX}assistant-${Date.now()}`,
    role: "assistant",
    content: "",
    metadata: null,
    agentRunId: null,
    editedFromMessageId: null,
    regeneratedFromMessageId: null,
    createdAt: new Date().toISOString(),
    agentRun: null,
  };
}

export function isOptimisticMessage(message: ChatMessage): boolean {
  return message.id.startsWith(OPTIMISTIC_PREFIX);
}
