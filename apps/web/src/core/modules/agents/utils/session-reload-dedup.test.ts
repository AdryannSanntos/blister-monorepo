import { describe, expect, it } from "vitest";

import { dedupeRunIds } from "../hooks/use-agent-chat-session";
import { buildThreadMessagesFromBlocks } from "./build-messages-from-blocks";

const baseRun = {
  id: "run-dup",
  agentId: "post",
  companyId: "c1",
  campaignId: null,
  status: "COMPLETED" as const,
  currentStepKey: null,
  inputPayload: { userInput: "Post teste" },
  outputPayload: {
    slides: [{ html: "<div>slide</div>" }],
    caption: "Legenda",
    hashtags: ["teste"],
    platform: "LinkedIn",
    format: "carousel",
    width: 1080,
    height: 1080,
  },
  errorMessage: null,
  pauseReason: null,
  pauseFormSchema: null,
  reviewStatus: "PENDING_REVIEW" as const,
  creditCost: null,
  createdAt: new Date().toISOString(),
  startedAt: new Date().toISOString(),
  completedAt: new Date().toISOString(),
};

describe("session reload deduplication", () => {
  it("dedupeRunIds removes repeated run ids", () => {
    expect(dedupeRunIds(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });

  it("buildThreadMessagesFromBlocks ignores duplicate run entries", () => {
    const messages = [
      {
        messageId: "run-dup:m0",
        role: "user" as const,
        blocks: [
          {
            blockId: "run-dup:m0:b0",
            blockType: "text" as const,
            index: 0,
            text: "Post teste",
            payload: {},
            status: "complete" as const,
          },
        ],
      },
    ];

    const ui = buildThreadMessagesFromBlocks({
      agentId: "post",
      runs: [
        { run: baseRun, messages, hasBlocks: true },
        { run: baseRun, messages, hasBlocks: true },
      ],
      activeRunId: baseRun.id,
    });

    const userMessages = ui.filter((message) => message.role === "user");
    expect(userMessages).toHaveLength(1);
  });
});
