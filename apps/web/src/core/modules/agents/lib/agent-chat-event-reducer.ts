import type { ConversationEvent } from "./agent-chat-events";

export type ChatCitation = {
  label: string;
  url?: string;
  sourceType?: string;
  sourceId?: string;
};

export type DisplayToolStatus = "pending" | "running" | "completed" | "failed";

export type DisplayToolCall = {
  toolCallId: string;
  groupId: string | null;
  toolName: string;
  status: DisplayToolStatus;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  displayOrder: number;
};

export type StreamMessageStatus =
  | "pending"
  | "streaming"
  | "completed"
  | "failed";

export type StreamMessageState = {
  messageId: string;
  text: string;
  status: StreamMessageStatus;
  citations: ChatCitation[];
  toolCalls: DisplayToolCall[];
  errorMessage: string | null;
  lastSequence: number;
};

export function createStreamMessageState(
  messageId: string,
): StreamMessageState {
  return {
    messageId,
    text: "",
    status: "pending",
    citations: [],
    toolCalls: [],
    errorMessage: null,
    lastSequence: 0,
  };
}

const STARTED_EVENTS = new Set<string>([
  "tool_started",
  "context_search_started",
  "file_search_started",
  "web_research_started",
]);
const COMPLETED_EVENTS = new Set<string>([
  "tool_completed",
  "context_search_completed",
  "file_search_completed",
  "web_research_completed",
]);
const SEARCH_TOOL_NAME: Record<string, string> = {
  context_search_started: "rag_search",
  file_search_started: "file_search",
  web_research_started: "web_research",
};

function citationKey(c: ChatCitation): string {
  return `${c.label}|${c.url ?? ""}|${c.sourceType ?? ""}|${c.sourceId ?? ""}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function readCitations(value: unknown): ChatCitation[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (c): c is Record<string, unknown> => Boolean(c) && typeof c === "object",
    )
    .filter((c) => typeof c.label === "string" && c.label.length > 0)
    .map((c) => ({
      label: c.label as string,
      url: typeof c.url === "string" ? c.url : undefined,
      sourceType: typeof c.sourceType === "string" ? c.sourceType : undefined,
      sourceId: typeof c.sourceId === "string" ? c.sourceId : undefined,
    }));
}

/**
 * Pure reducer mirroring the backend projection fold
 * (`foldConversationEvents`). Applies one conversation event to the in-flight
 * assistant message state. Same input → same output, so live streaming and a
 * replay-then-reduce produce an identical message.
 */
export function applyConversationEvent(
  state: StreamMessageState,
  event: ConversationEvent,
): StreamMessageState {
  const payload = asRecord(event.payload);
  const next: StreamMessageState = {
    ...state,
    lastSequence: Math.max(state.lastSequence, event.sequence),
    citations: [...state.citations],
    toolCalls: state.toolCalls.map((t) => ({ ...t })),
  };

  const mergeCitations = (incoming: ChatCitation[]) => {
    const seen = new Set(next.citations.map(citationKey));
    for (const c of incoming) {
      const key = citationKey(c);
      if (!seen.has(key)) {
        seen.add(key);
        next.citations.push(c);
      }
    }
  };

  const upsertTool = (toolCallId: string): DisplayToolCall => {
    let tool = next.toolCalls.find((t) => t.toolCallId === toolCallId);
    if (!tool) {
      tool = {
        toolCallId,
        groupId: null,
        toolName: "unknown",
        status: "pending",
        input: {},
        output: null,
        errorMessage: null,
        displayOrder: next.toolCalls.length,
      };
      next.toolCalls.push(tool);
    }
    return tool;
  };

  switch (event.eventType) {
    case "message_created":
      if (next.status === "pending") next.status = "pending";
      break;
    case "message_stream_started":
      if (next.status !== "completed" && next.status !== "failed") {
        next.status = "streaming";
      }
      break;
    case "message_text_delta":
      next.text += String(payload.delta ?? "");
      break;
    case "message_text_snapshot":
      next.text = String(payload.text ?? "");
      break;
    case "message_completed":
      next.text = typeof payload.text === "string" ? payload.text : next.text;
      next.status = "completed";
      next.errorMessage = null;
      mergeCitations(readCitations(payload.citations));
      break;
    case "message_failed":
      next.status = "failed";
      next.errorMessage =
        typeof payload.errorMessage === "string"
          ? payload.errorMessage
          : "Erro ao gerar a resposta.";
      break;
    case "citations_emitted":
      mergeCitations(readCitations(payload.citations));
      break;
    case "tool_group_started":
      break;
    case "tool_progress": {
      const id = String(payload.toolCallId ?? "");
      if (id) {
        const tool = upsertTool(id);
        if (tool.status === "pending") tool.status = "running";
      }
      break;
    }
    case "tool_failed": {
      const id = String(payload.toolCallId ?? "");
      if (id) {
        const tool = upsertTool(id);
        tool.status = "failed";
        tool.errorMessage =
          typeof payload.errorMessage === "string"
            ? payload.errorMessage
            : "Falha na ferramenta.";
      }
      break;
    }
    default: {
      if (STARTED_EVENTS.has(event.eventType)) {
        const id = String(payload.toolCallId ?? "");
        if (!id) break;
        const tool = upsertTool(id);
        if (tool.status !== "completed" && tool.status !== "failed") {
          tool.status = "running";
        }
        const derived = SEARCH_TOOL_NAME[event.eventType];
        if (typeof payload.toolName === "string")
          tool.toolName = payload.toolName;
        else if (derived && tool.toolName === "unknown")
          tool.toolName = derived;
        if (typeof payload.groupId === "string") tool.groupId = payload.groupId;
        if (payload.input && typeof payload.input === "object") {
          tool.input = payload.input as Record<string, unknown>;
        } else if (typeof payload.query === "string") {
          tool.input = { ...tool.input, query: payload.query };
        }
        if (typeof payload.displayOrder === "number") {
          tool.displayOrder = payload.displayOrder;
        }
      } else if (COMPLETED_EVENTS.has(event.eventType)) {
        const id = String(payload.toolCallId ?? "");
        if (!id) break;
        const tool = upsertTool(id);
        tool.status = "completed";
        if (payload.output && typeof payload.output === "object") {
          tool.output = payload.output as Record<string, unknown>;
        }
        if (typeof payload.resultCount === "number") {
          tool.output = {
            ...(tool.output ?? {}),
            resultCount: payload.resultCount,
          };
        }
      }
      break;
    }
  }

  next.toolCalls.sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      a.toolCallId.localeCompare(b.toolCallId),
  );
  return next;
}
