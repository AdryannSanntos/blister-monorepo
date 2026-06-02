import { describe, expect, it } from "vitest";
import { drainSseBuffer, parseSseFrame } from "./agent-chat-events";

describe("parseSseFrame", () => {
  it("parses a well-formed frame into a typed event", () => {
    const frame =
      'event: message_text_delta\nid: 7\ndata: {"threadId":"t","messageId":"m","sequence":7,"payload":{"delta":"oi"}}';
    const event = parseSseFrame(frame);
    expect(event).toEqual({
      eventType: "message_text_delta",
      threadId: "t",
      messageId: "m",
      sequence: 7,
      payload: { delta: "oi" },
    });
  });

  it("ignores heartbeat/comment frames", () => {
    expect(parseSseFrame(": ping")).toBeNull();
  });

  it("returns null for an unknown event type", () => {
    const frame =
      'event: message_exploded\ndata: {"threadId":"t","messageId":"m","sequence":1}';
    expect(parseSseFrame(frame)).toBeNull();
  });

  it("returns null when the data is missing required scoping fields", () => {
    const frame = 'event: message_text_delta\ndata: {"payload":{"delta":"oi"}}';
    expect(parseSseFrame(frame)).toBeNull();
  });

  it("returns null for malformed JSON instead of throwing", () => {
    const frame = "event: message_completed\ndata: {not json";
    expect(parseSseFrame(frame)).toBeNull();
  });
});

describe("drainSseBuffer", () => {
  it("extracts complete frames and keeps the incomplete tail", () => {
    const buffer =
      'event: message_stream_started\nid: 1\ndata: {"threadId":"t","messageId":"m","sequence":1,"payload":{}}\n\n' +
      'event: message_text_delta\nid: 2\ndata: {"threadId":"t","messageId":"m","sequence":2,"payload":{"delta":"a"}}\n\n' +
      "event: message_text_delta\nid: 3\ndata: {incomplete";

    const { events, rest } = drainSseBuffer(buffer);
    expect(events.map((e) => e.sequence)).toEqual([1, 2]);
    expect(rest).toContain("incomplete");
  });

  it("returns no events when no complete frame is present yet", () => {
    const { events, rest } = drainSseBuffer(
      "event: message_text_delta\ndata: {par",
    );
    expect(events).toHaveLength(0);
    expect(rest).toContain("par");
  });
});
