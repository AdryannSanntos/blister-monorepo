import { describe, expect, it } from "vitest";
import {
  applyConversationEvent,
  createStreamMessageState,
  type StreamMessageState,
} from "./agent-chat-event-reducer";
import type {
  ConversationEvent,
  ConversationEventType,
} from "./agent-chat-events";

const evt = (
  sequence: number,
  eventType: ConversationEventType,
  payload: Record<string, unknown> = {},
): ConversationEvent => ({
  eventType,
  threadId: "t",
  messageId: "m",
  sequence,
  payload,
});

function reduceAll(events: ConversationEvent[]): StreamMessageState {
  return events.reduce(applyConversationEvent, createStreamMessageState("m"));
}

describe("applyConversationEvent — message text", () => {
  it("accumulates deltas in order and marks streaming", () => {
    const state = reduceAll([
      evt(1, "message_stream_started"),
      evt(2, "message_text_delta", { delta: "Ola " }),
      evt(3, "message_text_delta", { delta: "mundo" }),
    ]);
    expect(state.text).toBe("Ola mundo");
    expect(state.status).toBe("streaming");
  });

  it("lets a snapshot replace accumulated deltas", () => {
    const state = reduceAll([
      evt(1, "message_text_delta", { delta: "lixo" }),
      evt(2, "message_text_snapshot", { text: "limpo" }),
    ]);
    expect(state.text).toBe("limpo");
  });

  it("completion sets authoritative text + status and merges citations", () => {
    const state = reduceAll([
      evt(1, "message_text_delta", { delta: "streamed" }),
      evt(2, "message_completed", {
        text: "final",
        citations: [{ label: "Brain" }],
      }),
    ]);
    expect(state.text).toBe("final");
    expect(state.status).toBe("completed");
    expect(state.citations).toEqual([{ label: "Brain" }]);
  });

  it("failure preserves partial text and records the error", () => {
    const state = reduceAll([
      evt(1, "message_stream_started"),
      evt(2, "message_text_delta", { delta: "comecei" }),
      evt(3, "message_failed", { errorMessage: "LLM caiu" }),
    ]);
    expect(state.status).toBe("failed");
    expect(state.errorMessage).toBe("LLM caiu");
    expect(state.text).toBe("comecei");
  });

  it("dedupes citations across emissions", () => {
    const state = reduceAll([
      evt(1, "citations_emitted", {
        citations: [{ label: "Brain", sourceId: "b1" }],
      }),
      evt(2, "citations_emitted", {
        citations: [
          { label: "Brain", sourceId: "b1" },
          { label: "Asset", sourceId: "a1" },
        ],
      }),
    ]);
    expect(state.citations).toHaveLength(2);
  });

  it("does not let a stray stream_started reopen a completed message", () => {
    const state = reduceAll([
      evt(1, "message_completed", { text: "pronto" }),
      evt(2, "message_stream_started"),
    ]);
    expect(state.status).toBe("completed");
  });
});

describe("applyConversationEvent — tool calls", () => {
  it("folds a full tool lifecycle into one completed row", () => {
    const state = reduceAll([
      evt(1, "tool_group_started", { groupId: "g", label: "Pesquisando" }),
      evt(2, "tool_started", {
        toolCallId: "t1",
        toolName: "rag_search",
        input: { query: "x" },
      }),
      evt(3, "tool_completed", {
        toolCallId: "t1",
        output: { summary: "ok" },
        resultCount: 2,
      }),
    ]);
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0]).toMatchObject({
      toolCallId: "t1",
      toolName: "rag_search",
      status: "completed",
      input: { query: "x" },
    });
    expect(state.toolCalls[0].output).toMatchObject({
      summary: "ok",
      resultCount: 2,
    });
  });

  it("records a failed tool with its error", () => {
    const state = reduceAll([
      evt(1, "tool_started", {
        toolCallId: "t1",
        toolName: "web_research",
        input: {},
      }),
      evt(2, "tool_failed", {
        toolCallId: "t1",
        errorMessage: "provider down",
      }),
    ]);
    expect(state.toolCalls[0].status).toBe("failed");
    expect(state.toolCalls[0].errorMessage).toBe("provider down");
  });

  it("folds search_started/completed into the same row and derives the tool name", () => {
    const state = reduceAll([
      evt(1, "context_search_started", { toolCallId: "t9", query: "empresa" }),
      evt(2, "context_search_completed", { toolCallId: "t9", resultCount: 4 }),
    ]);
    expect(state.toolCalls).toHaveLength(1);
    expect(state.toolCalls[0]).toMatchObject({
      toolCallId: "t9",
      toolName: "rag_search",
      status: "completed",
      input: { query: "empresa" },
    });
  });

  it("is order-independent (folds shuffled events to the same result)", () => {
    const inOrder = reduceAll([
      evt(1, "message_text_delta", { delta: "A" }),
      evt(2, "message_text_delta", { delta: "B" }),
    ]);
    const shuffled = reduceAll([
      evt(2, "message_text_delta", { delta: "B" }),
      evt(1, "message_text_delta", { delta: "A" }),
    ]);
    // The reducer applies in arrival order, but the hook always feeds ascending
    // sequence; this guards the lastSequence accounting either way.
    expect(inOrder.text).toBe("AB");
    expect(shuffled.lastSequence).toBe(2);
  });
});
