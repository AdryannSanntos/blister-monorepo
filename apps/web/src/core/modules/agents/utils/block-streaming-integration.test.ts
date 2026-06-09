import { describe, expect, it } from "vitest";

import { hydrateFromBlocks } from "./agent-block-reducer";
import { buildThreadMessagesFromBlocks } from "./build-messages-from-blocks";

const MCP_OUTPUT = "tool-mcp__user-tools__BlisterOutput";

describe("block streaming integration gaps", () => {
  it("shows output for completed copywriter run when only user block persisted (H4)", () => {
    const run = {
      id: "run-copy-1",
      agentId: "copywriter",
      companyId: "c1",
      campaignId: null,
      status: "COMPLETED" as const,
      currentStepKey: null,
      inputPayload: { userInput: "Legenda para promoção" },
      outputPayload: {
        caption: "Promoção imperdível!",
        hashtags: ["#promo"],
        tone: "enthusiastic",
        reviewStatus: "PENDING",
      },
      errorMessage: null,
      pauseReason: null,
      pauseFormSchema: null,
      reviewStatus: "PENDING_REVIEW" as const,
      creditCost: 0.01,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    const persisted = hydrateFromBlocks(
      [
        {
          id: "db-user",
          messageId: "run-copy-1:m0",
          role: "user",
          blockType: "text",
          index: 0,
          label: null,
          text: "Legenda para promoção",
          payload: {},
          stepKey: null,
          status: "complete",
          createdAt: new Date().toISOString(),
        },
      ],
      "COMPLETED",
    );

    const messages = buildThreadMessagesFromBlocks({
      agentId: "copywriter",
      runs: [
        {
          run,
          messages: persisted.messages,
          hasBlocks: true,
        },
      ],
      activeRunId: run.id,
    });

    const hasOutputPart = messages.some((message) =>
      message.parts.some((part) => part.type === MCP_OUTPUT),
    );

    expect(hasOutputPart).toBe(true);
  });
});
