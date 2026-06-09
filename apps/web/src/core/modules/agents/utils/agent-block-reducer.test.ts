import { compareAgentMessageIds } from "@company-os/types";
import { describe, expect, it } from "vitest";

import { hydrateFromBlocks, mergeBlockState, reduceBlockEvent } from "./agent-block-reducer";

describe("compareAgentMessageIds", () => {
  it("sorts numeric message suffixes chronologically", () => {
    const runId = "run-1";
    expect(
      compareAgentMessageIds(`${runId}:m2`, `${runId}:m10`),
    ).toBeLessThan(0);
    expect(
      compareAgentMessageIds(`${runId}:m10`, `${runId}:m11`),
    ).toBeLessThan(0);
    expect(
      compareAgentMessageIds(`${runId}:m11`, `${runId}:m2`),
    ).toBeGreaterThan(0);
  });
});

describe("hydrateFromBlocks message ordering", () => {
  it("orders messages by numeric suffix, not lexicographic", () => {
    const runId = "run-1";
    const block = (
      messageId: string,
      createdAt: string,
    ): Parameters<typeof hydrateFromBlocks>[0][number] => ({
      id: `${messageId}-block`,
      messageId,
      role: messageId.endsWith(":m0") ? "user" : "assistant",
      blockType: "text",
      index: 0,
      label: null,
      text: messageId,
      payload: {},
      stepKey: null,
      status: "complete",
      createdAt,
    });

    const state = hydrateFromBlocks(
      [
        block(`${runId}:m10`, "2026-01-01T00:10:00.000Z"),
        block(`${runId}:m2`, "2026-01-01T00:02:00.000Z"),
        block(`${runId}:m0`, "2026-01-01T00:00:00.000Z"),
        block(`${runId}:m11`, "2026-01-01T00:11:00.000Z"),
      ],
      "COMPLETED",
    );

    expect(state.messages.map((message) => message.messageId)).toEqual([
      `${runId}:m0`,
      `${runId}:m2`,
      `${runId}:m10`,
      `${runId}:m11`,
    ]);
  });
});

describe("mergeBlockState", () => {
  it("merges persisted and live blocks by blockId (H4 merge)", () => {
    const persisted = hydrateFromBlocks(
      [
        {
          id: "db1",
          messageId: "r1:m1",
          role: "assistant",
          blockType: "thinking",
          index: 0,
          label: null,
          text: "from db",
          payload: {},
          stepKey: null,
          status: "complete",
          createdAt: "",
        },
      ],
      "RUNNING",
    );

    const live = {
      messages: [
        {
          messageId: "r1:m1",
          role: "assistant" as const,
          blocks: [
            {
              blockId: "r1:m1:b0",
              blockType: "thinking" as const,
              index: 0,
              text: "from sse",
              payload: {},
              status: "complete" as const,
            },
            {
              blockId: "r1:m1:b1",
              blockType: "searching_context" as const,
              index: 1,
              text: "",
              payload: { resultsCount: 2 },
              status: "complete" as const,
            },
          ],
        },
      ],
      runStatus: "RUNNING" as const,
    };

    const merged = mergeBlockState(persisted, live);
    expect(merged.messages[0].blocks).toHaveLength(2);
    expect(merged.messages[0].blocks[0].text).toBe("from sse");
  });

  it("ignores block_delta replay on completed blocks", () => {
    const withBlock = {
      messages: [
        {
          messageId: "r1:m1",
          role: "assistant" as const,
          blocks: [
            {
              blockId: "r1:m1:b0",
              blockType: "thinking" as const,
              index: 0,
              text: "final text",
              payload: {},
              status: "complete" as const,
            },
          ],
        },
      ],
      runStatus: "RUNNING" as const,
    };

    const afterDelta = reduceBlockEvent(withBlock, {
      type: "block_delta",
      runId: "r1",
      timestamp: new Date().toISOString(),
      data: {
        messageId: "r1:m1",
        blockId: "r1:m1:b0",
        delta: "final text",
      },
    });

    expect(afterDelta.messages[0]?.blocks[0]?.text).toBe("final text");
  });
});
