/**
 * Client-side mirror of the backend conversation event contract
 * (`apps/api/src/conversation/dto/conversation-event.dto.ts`). The frontend only
 * needs to *consume* events, so this is a thin set of types plus a pure SSE frame
 * parser — no Zod validation duplicated here.
 */

export type ConversationEventType =
  | "message_created"
  | "message_stream_started"
  | "message_text_delta"
  | "message_text_snapshot"
  | "message_completed"
  | "message_failed"
  | "tool_group_started"
  | "tool_started"
  | "tool_progress"
  | "tool_completed"
  | "tool_failed"
  | "citations_emitted"
  | "context_search_started"
  | "context_search_completed"
  | "file_search_started"
  | "file_search_completed"
  | "web_research_started"
  | "web_research_completed";

export type ConversationEvent = {
  eventType: ConversationEventType;
  threadId: string;
  messageId: string;
  sequence: number;
  payload: Record<string, unknown>;
};

const KNOWN_EVENT_TYPES = new Set<string>([
  "message_created",
  "message_stream_started",
  "message_text_delta",
  "message_text_snapshot",
  "message_completed",
  "message_failed",
  "tool_group_started",
  "tool_started",
  "tool_progress",
  "tool_completed",
  "tool_failed",
  "citations_emitted",
  "context_search_started",
  "context_search_completed",
  "file_search_started",
  "file_search_completed",
  "web_research_started",
  "web_research_completed",
]);

/**
 * Parses a single raw SSE frame (the text between two blank lines) into a typed
 * conversation event. Returns `null` for comments/heartbeats or malformed frames
 * so the caller can simply skip them.
 */
export function parseSseFrame(rawFrame: string): ConversationEvent | null {
  const lines = rawFrame.split("\n");
  let event: string | null = null;
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith(":")) continue; // heartbeat / comment
    if (line.startsWith("event:")) {
      event = line.slice("event:".length).trim();
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice("data:".length).trimStart());
    }
  }

  if (!event || !KNOWN_EVENT_TYPES.has(event) || dataLines.length === 0) {
    return null;
  }

  try {
    const data = JSON.parse(dataLines.join("\n")) as {
      threadId?: string;
      messageId?: string;
      sequence?: number;
      payload?: Record<string, unknown>;
    };
    if (
      typeof data.threadId !== "string" ||
      typeof data.messageId !== "string" ||
      typeof data.sequence !== "number"
    ) {
      return null;
    }
    return {
      eventType: event as ConversationEventType,
      threadId: data.threadId,
      messageId: data.messageId,
      sequence: data.sequence,
      payload: data.payload ?? {},
    };
  } catch {
    return null;
  }
}

/**
 * Splits a growing SSE buffer into complete frames, returning the parsed events
 * and the leftover (incomplete) buffer tail. Frames are separated by a blank line.
 */
export function drainSseBuffer(buffer: string): {
  events: ConversationEvent[];
  rest: string;
} {
  const events: ConversationEvent[] = [];
  let working = buffer;
  let separatorIndex = working.indexOf("\n\n");

  while (separatorIndex !== -1) {
    const frame = working.slice(0, separatorIndex);
    working = working.slice(separatorIndex + 2);
    const parsed = parseSseFrame(frame);
    if (parsed) events.push(parsed);
    separatorIndex = working.indexOf("\n\n");
  }

  return { events, rest: working };
}
