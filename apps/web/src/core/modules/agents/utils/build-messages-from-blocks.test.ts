import { describe, expect, it } from "vitest";

import type { MessageState } from "./agent-block-reducer";
import {
  buildLegacyRunMessages,
  buildMessagesFromBlocks,
} from "./build-messages-from-blocks";

const baseRun = {
  id: "run-1",
  agentId: "post",
  companyId: "c1",
  campaignId: null,
  status: "COMPLETED" as const,
  currentStepKey: null,
  inputPayload: { userInput: "Post sobre bolo" },
  outputPayload: {
    slides: [{ html: "<div>slide</div>" }],
    caption: "Legenda",
    hashtags: ["bolo"],
    platform: "Instagram",
    format: "feed",
    width: 1080,
    height: 1350,
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

describe("build-messages-from-blocks", () => {
  it("maps thinking + text blocks into one assistant message", () => {
    const messages: MessageState[] = [
      {
        messageId: "m1",
        role: "assistant",
        blocks: [
          {
            blockId: "b1",
            blockType: "thinking",
            index: 0,
            text: "planejando",
            payload: {},
            status: "complete",
          },
          {
            blockId: "b2",
            blockType: "text",
            index: 1,
            text: "Olá!",
            payload: {},
            status: "complete",
          },
        ],
      },
    ];

    const ui = buildMessagesFromBlocks({
      agentId: "post",
      run: baseRun,
      messages,
    });

    expect(ui).toHaveLength(1);
    expect(ui[0].parts).toHaveLength(1);
    expect(ui[0].parts[0]).toMatchObject({ type: "text", text: "Olá!" });
  });

  it("maps form_question to tool-Question with input-available", () => {
    const messages: MessageState[] = [
      {
        messageId: "m1",
        role: "assistant",
        blocks: [
          {
            blockId: "b1",
            blockType: "form_question",
            index: 0,
            text: "",
            payload: {
              formSchema: {
                fields: [
                  {
                    name: "socialNetwork",
                    label: "Qual rede social?",
                    kind: "single",
                    options: [{ id: "instagram", label: "Instagram" }],
                  },
                ],
              },
            },
            status: "complete",
          },
        ],
      },
    ];

    const ui = buildMessagesFromBlocks({
      agentId: "post",
      run: { ...baseRun, status: "PAUSED" },
      messages,
    });

    expect(ui[0].parts[0]).toMatchObject({
      type: "tool-Question",
      state: "input-available",
    });
  });

  it("falls back for runs without persisted blocks", () => {
    const ui = buildLegacyRunMessages({
      agentId: "post",
      run: baseRun,
      messages: [],
    });

    expect(ui.some((message) => message.role === "user")).toBe(true);
    expect(
      ui.some((message) =>
        message.parts.some((part) => part.type?.includes("BlisterPost")),
      ),
    ).toBe(true);
  });

  it("keeps the user's form answer as a prettified bubble and shows the question as text", () => {
    const run = {
      ...baseRun,
      status: "COMPLETED" as const,
      inputPayload: {
        userInput: "Post sobre bolo",
        socialNetwork: "linkedin",
        postFormat: "carousel",
      },
    };

    const messages: MessageState[] = [
      {
        messageId: "m0",
        role: "user",
        blocks: [
          {
            blockId: "m0:b0",
            blockType: "text",
            index: 0,
            text: "Post sobre bolo",
            payload: {},
            status: "complete",
          },
        ],
      },
      {
        messageId: "m1",
        role: "assistant",
        blocks: [
          {
            blockId: "m1:b0",
            blockType: "form_question",
            index: 0,
            text: "",
            payload: {
              formSchema: {
                fields: [
                  {
                    name: "socialNetwork",
                    label: "Para qual rede social?",
                    kind: "single",
                    options: [
                      { id: "instagram", label: "Instagram" },
                      { id: "linkedin", label: "LinkedIn" },
                    ],
                  },
                ],
              },
            },
            status: "complete",
          },
        ],
      },
      {
        messageId: "m2",
        role: "user",
        blocks: [
          {
            blockId: "m2:b0",
            blockType: "text",
            index: 0,
            text: "linkedin",
            payload: {},
            status: "complete",
          },
        ],
      },
    ];

    const ui = buildMessagesFromBlocks({
      agentId: "post",
      run,
      messages,
    });

    const userMessages = ui.filter((message) => message.role === "user");
    // Initial prompt + the answer bubble are both kept.
    expect(userMessages).toHaveLength(2);
    expect(userMessages[0]?.parts[0]).toMatchObject({
      type: "text",
      text: "Post sobre bolo",
    });
    // The raw "linkedin" answer is prettified to the option label.
    expect(userMessages[1]?.parts[0]).toMatchObject({
      type: "text",
      text: "LinkedIn",
    });
    // The answered question is rendered as assistant text (no duplicated answer card).
    const assistant = ui.find((message) => message.role === "assistant");
    expect(assistant?.parts[0]).toMatchObject({
      type: "text",
      text: "Para qual rede social?",
    });
  });
});
