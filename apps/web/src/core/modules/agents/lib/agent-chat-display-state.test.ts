import { describe, expect, it } from "vitest";
import {
  mergeDisplayMessages,
  type ReplayMessage,
  replayMessageToDisplay,
} from "./agent-chat-display-state";
import { createStreamMessageState } from "./agent-chat-event-reducer";

describe("replayMessageToDisplay", () => {
  it("maps a persisted assistant message with tool calls + attachments off user metadata", () => {
    const replay: ReplayMessage = {
      id: "a1",
      role: "assistant",
      content: "resposta",
      status: "completed",
      citations: [{ label: "Brain" }],
      toolCalls: [
        {
          toolCallId: "t1",
          groupId: "tools",
          toolName: "rag_search",
          status: "completed",
          inputPayload: { query: "x" },
          outputPayload: { summary: "ok" },
          errorMessage: null,
          displayOrder: 0,
        },
      ],
    };
    const display = replayMessageToDisplay(replay);
    expect(display.content).toBe("resposta");
    expect(display.status).toBe("completed");
    expect(display.toolCalls[0]).toMatchObject({
      toolCallId: "t1",
      status: "completed",
      input: { query: "x" },
    });
  });

  it("reads user attachments from metadata", () => {
    const display = replayMessageToDisplay({
      id: "u1",
      role: "user",
      content: "oi",
      metadata: {
        attachments: [
          { id: "f1", filename: "a.png", contentType: "image/png" },
        ],
      },
    });
    expect(display.attachments).toHaveLength(1);
    expect(display.attachments[0].filename).toBe("a.png");
  });
});

describe("mergeDisplayMessages", () => {
  const replay: ReplayMessage[] = [
    { id: "u1", role: "user", content: "pergunta" },
    { id: "a1", role: "assistant", content: "resposta", status: "completed" },
  ];

  it("returns persisted messages when there is no live turn", () => {
    const merged = mergeDisplayMessages({ replay });
    expect(merged.map((m) => m.id)).toEqual(["u1", "a1"]);
  });

  it("appends the optimistic user + live assistant while streaming", () => {
    const streaming = createStreamMessageState("a2");
    streaming.text = "streaming...";
    streaming.status = "streaming";
    const pendingUser = replayMessageToDisplay({
      id: "pending-user-1",
      role: "user",
      content: "nova",
    });

    const merged = mergeDisplayMessages({ replay, pendingUser, streaming });
    expect(merged.map((m) => m.id)).toEqual([
      "u1",
      "a1",
      "pending-user-1",
      "a2",
    ]);
    expect(merged[3].content).toBe("streaming...");
    expect(merged[3].isStreaming).toBe(true);
  });

  it("drops the optimistic user once the same id is already persisted", () => {
    const pendingUser = replayMessageToDisplay({
      id: "u1",
      role: "user",
      content: "dup",
    });
    const merged = mergeDisplayMessages({ replay, pendingUser });
    // u1 already persisted → not duplicated
    expect(merged.filter((m) => m.id === "u1")).toHaveLength(1);
  });

  it("drops the optimistic first user message once the persisted replay already contains the same content", () => {
    const replayWithLatestUser: ReplayMessage[] = [
      { id: "u1", role: "user", content: "pergunta" },
    ];
    const pendingUser = replayMessageToDisplay({
      id: "pending-user-thread-1",
      role: "user",
      content: "pergunta",
    });

    const merged = mergeDisplayMessages({ replay: replayWithLatestUser, pendingUser });

    expect(merged.filter((m) => m.role === "user")).toHaveLength(1);
    expect(merged[0]?.id).toBe("u1");
  });

  it("keeps the optimistic user when the persisted replay has a different message", () => {
    const pendingUser = replayMessageToDisplay({
      id: "pending-user-thread-1",
      role: "user",
      content: "outra pergunta",
    });

    const merged = mergeDisplayMessages({ replay, pendingUser });

    expect(merged.map((message) => message.id)).toEqual([
      "u1",
      "a1",
      "pending-user-thread-1",
    ]);
  });

  it("keeps a repeated optimistic user message when the latest persisted message is an assistant reply", () => {
    const pendingUser = replayMessageToDisplay({
      id: "pending-user-thread-1",
      role: "user",
      content: "pergunta",
    });

    const merged = mergeDisplayMessages({ replay, pendingUser });

    expect(merged.map((message) => message.id)).toEqual([
      "u1",
      "a1",
      "pending-user-thread-1",
    ]);
  });

  it("drops the optimistic user once the same turn is already persisted with an assistant reply", () => {
    const replayWithTurn: ReplayMessage[] = [
      {
        id: "u2",
        role: "user",
        content: "nova pergunta",
        createdAt: "2026-05-30T12:00:05.000Z",
      },
      {
        id: "a2",
        role: "assistant",
        content: "resposta",
        status: "streaming",
        isStreaming: true,
      },
    ];
    const pendingUser = replayMessageToDisplay({
      id: "pending-user-thread-1",
      role: "user",
      content: "nova pergunta",
      createdAt: "2026-05-30T12:00:05.100Z",
    });

    const merged = mergeDisplayMessages({ replay: replayWithTurn, pendingUser });

    expect(merged.filter((message) => message.role === "user")).toHaveLength(1);
    expect(merged[0]?.id).toBe("u2");
  });

  it("drops the live assistant once it is persisted in replay (no duplicate after stream ends)", () => {
    const replayWithAssistant: ReplayMessage[] = [
      ...replay,
      {
        id: "a2",
        role: "assistant",
        content: "resposta final",
        status: "completed",
      },
    ];
    const streaming = createStreamMessageState("a2");
    streaming.status = "completed";
    streaming.text = "resposta final";

    const merged = mergeDisplayMessages({
      replay: replayWithAssistant,
      streaming,
    });
    expect(merged.filter((m) => m.id === "a2")).toHaveLength(1);
  });
});
