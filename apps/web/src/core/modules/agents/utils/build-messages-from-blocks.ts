import type {
  AgentRunBlockStatus,
  AgentRunStatusDto,
  ReviewStatus,
} from "@company-os/types";
import type { UIMessage } from "ai";

import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";

import type { AgentUiId } from "../config/agent-ui-config";
import type { BlockState, MessageState } from "./agent-block-reducer";
import {
  canReviewRun,
  getRunUserInput,
  parsePostOutput,
} from "./agent-run-helpers";
import type {
  ClarificationCallbacks,
  PlanApprovalCallbacks,
  QuestionAnswerHandler,
  ReviewCallbacks,
} from "./build-agent-messages";
import { formatAgentOutputMarkdown } from "./format-agent-output-markdown";
import {
  formatDesignPlanPreviewMarkdown,
  parseDesignPlanPreview,
} from "./format-design-plan-preview";
import {
  DESIGN_PLAN_APPROVAL_PAUSE_TYPE,
  isPostDesignPlanAwaitingApproval,
} from "./post-onboarding-fields";

const MCP_OUTPUT = "tool-mcp__user-tools__BlisterOutput";
const MCP_REVIEW = "tool-mcp__user-tools__BlisterReview";
const MCP_POST = "tool-mcp__user-tools__BlisterPost";

const looksLikeStructuredPayload = (text: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) return true;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
};

const blockPartState = (
  status: AgentRunBlockStatus,
): "input-streaming" | "output-available" | "input-available" => {
  if (status === "streaming") return "input-streaming";
  if (status === "error") return "output-available";
  return "output-available";
};

const buildInteractiveQuestionPart = (
  toolCallId: string,
  question: {
    kind: "single" | "multi" | "text";
    title: string;
    placeholder?: string;
    description?: string;
    options?: Array<{ id: string; label: string; description?: string }>;
  },
  questionAnswerHandler?: QuestionAnswerHandler | null,
  initialText?: string,
) => ({
  type: "tool-Question" as const,
  toolCallId,
  state: "input-available" as const,
  input: {
    questions: [question],
    totalQuestions: 1,
    questionIndex: 1,
    initialAnswer: initialText
      ? { kind: "text" as const, text: initialText }
      : undefined,
    onSubmitAnswer: questionAnswerHandler
      ? (answer: QuestionAnswer) =>
          questionAnswerHandler({ toolCallId, answer })
      : undefined,
  },
});

const buildReviewPart = (
  agentId: AgentUiId,
  run: AgentRunStatusDto,
  reviewCallbacks: ReviewCallbacks,
) => {
  const markdown = formatAgentOutputMarkdown(agentId, run.outputPayload);
  const reviewStatus = run.reviewStatus;

  return {
    type: MCP_REVIEW,
    toolCallId: `review-${run.id}`,
    state: "output-available" as const,
    input: {
      markdown,
      reviewStatus,
      canEdit: agentId === "copywriter" || agentId === "post",
      onApprove: reviewCallbacks.onApprove,
      onReject: reviewCallbacks.onReject,
      onRegenerate: reviewCallbacks.onRegenerate,
      onEdit: reviewCallbacks.onEdit,
    },
    output: { markdown, reviewStatus },
  };
};

const buildPostPart = (
  run: AgentRunStatusDto,
  outputPayload: Record<string, unknown>,
  reviewCallbacks: ReviewCallbacks | null,
) => {
  const output = parsePostOutput(outputPayload);
  const reviewStatus = run.reviewStatus;

  return {
    type: MCP_POST,
    toolCallId: `post-${run.id}`,
    state: "output-available" as const,
    input: {
      slides: output.slides ?? [],
      platform: output.platform,
      format: output.format,
      width: output.width,
      height: output.height,
      caption: output.caption,
      hashtags: output.hashtags ?? [],
      reviewStatus,
      canReview: Boolean(reviewCallbacks),
      onApprove: reviewCallbacks?.onApprove,
      onReject: reviewCallbacks?.onReject,
      onRegenerate: reviewCallbacks?.onRegenerate,
      onEdit: reviewCallbacks?.onEdit,
    },
    output: { slides: output.slides ?? [] },
  };
};

const buildOutputPart = (
  agentId: AgentUiId,
  outputPayload: Record<string, unknown>,
) => {
  const markdown = formatAgentOutputMarkdown(agentId, outputPayload);
  return {
    type: MCP_OUTPUT,
    toolCallId: `output-${outputPayload.agentId ?? agentId}`,
    state: "output-available" as const,
    input: { markdown },
    output: { markdown },
  };
};

const mapFormQuestionPart = (
  block: BlockState,
  run: AgentRunStatusDto,
  clarificationCallbacks?: ClarificationCallbacks | null,
  questionAnswerHandler?: QuestionAnswerHandler | null,
) => {
  const formSchema = block.payload.formSchema as {
    fields?: Array<{
      name: string;
      label: string;
      kind?: "single" | "multi" | "text";
      description?: string;
      options?: Array<{ id: string; label: string; description?: string }>;
      required?: boolean;
      placeholder?: string;
    }>;
  } | null;

  const questionInputExtras = clarificationCallbacks
    ? {
        onSubmitAnswer: clarificationCallbacks.onAnswer,
        submitLabel: clarificationCallbacks.submitLabel,
      }
    : {};

  const fields = formSchema?.fields ?? [];
  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  const fieldsAnswered =
    fields.length > 0 &&
    fields.every((field) => {
      const value = inputPayload[field.name];
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  // Interactive only for the question still awaiting an answer — already-answered
  // questions from earlier pauses render as plain text even while the run is paused.
  const isInteractive =
    run.status === "PAUSED" && block.status === "complete" && !fieldsAnswered;

  // Answered / closed question: render the question text only. The user's answer
  // is rendered as their own message bubble (see buildMessagesFromBlocks), so the
  // question + answer read as a natural conversation turn without duplication.
  if (!isInteractive) {
    const title = fields
      .map((field) => field.label)
      .filter((label): label is string => Boolean(label))
      .join("\n");
    return title ? { type: "text" as const, text: title } : null;
  }

  const baseInput = {
    questions: fields.map((field) => ({
      kind: field.kind ?? ("text" as const),
      title: field.label,
      description: field.description,
      options: field.options,
      placeholder: field.placeholder,
    })),
    totalQuestions: fields.length,
    questionIndex: 1,
    ...questionInputExtras,
    onSubmitAnswer: questionAnswerHandler
      ? (answer: QuestionAnswer) =>
          questionAnswerHandler({ toolCallId: block.blockId, answer })
      : questionInputExtras.onSubmitAnswer,
  };

  if (fields.length === 0) {
    return {
      type: "tool-Question" as const,
      toolCallId: block.blockId,
      state: "input-available" as const,
      input: {
        questions: [
          {
            kind: "text" as const,
            title: run.pauseReason ?? "Confirme para continuar.",
            placeholder: "Digite para continuar",
          },
        ],
        totalQuestions: 1,
        questionIndex: 1,
        ...questionInputExtras,
      },
    };
  }

  return {
    type: "tool-Question" as const,
    toolCallId: block.blockId,
    state: "input-available" as const,
    input: baseInput,
  };
};

const mapBlockToPart = (
  block: BlockState,
  options: {
    agentId: AgentUiId;
    run: AgentRunStatusDto;
    reviewCallbacks?: ReviewCallbacks | null;
    clarificationCallbacks?: ClarificationCallbacks | null;
    planApprovalCallbacks?: PlanApprovalCallbacks | null;
    questionAnswerHandler?: QuestionAnswerHandler | null;
  },
): UIMessage["parts"][number] | null => {
  const state = blockPartState(block.status);
  const runIsTerminal =
    options.run.status === "COMPLETED" ||
    options.run.status === "FAILED" ||
    options.run.status === "CANCELLED";

  switch (block.blockType) {
    case "thinking":
    case "working":
      // Only show the live "Processando…" placeholder while the run is active.
      // Once the run ends — or a block is left mid-stream by a provider error —
      // the placeholder is meaningless and would otherwise linger/duplicate.
      if (block.status !== "streaming" || runIsTerminal) return null;
      if (looksLikeStructuredPayload(block.text)) {
        return {
          type: "tool-Thinking",
          toolCallId: block.blockId,
          state: "input-streaming" as const,
          input: {
            thought: block.label || "Processando...",
          },
        } as UIMessage["parts"][number];
      }
      return {
        type: "tool-Thinking",
        toolCallId: block.blockId,
        state: "input-streaming" as const,
        input: {
          thought: block.text || block.label || "Processando...",
        },
      } as UIMessage["parts"][number];

    case "searching_context": {
      const results = Array.isArray(block.payload.results)
        ? block.payload.results
        : [];
      const label =
        block.label ??
        (typeof block.payload.label === "string"
          ? block.payload.label
          : undefined);
      return {
        type: "tool-Search",
        toolCallId: block.blockId,
        state,
        input: {
          toolName: "rag_search",
          query: label ?? "Consultando o Cérebro da Marca",
        },
        output: { results },
      } as UIMessage["parts"][number];
    }

    case "planning": {
      const planPayload = block.payload.plan as
        | { id?: string; title?: string; summary?: string; status?: string }
        | undefined;
      const designPlan = parseDesignPlanPreview(block.payload.designPlan);
      const summary =
        planPayload?.summary ??
        (typeof block.payload.summary === "string"
          ? block.payload.summary
          : "");
      const awaitingApproval = isPostDesignPlanAwaitingApproval(options.run);
      const planApproved =
        (options.run.inputPayload as Record<string, unknown>)
          .designPlanApproved === true;

      return {
        type: "tool-PlanWrite",
        toolCallId: block.blockId,
        state,
        input: {
          plan: {
            id: planPayload?.id ?? block.blockId,
            title: planPayload?.title ?? "Plano de design",
            summary: designPlan
              ? formatDesignPlanPreviewMarkdown(designPlan)
              : summary,
            status: planApproved
              ? "approved"
              : awaitingApproval
                ? "awaiting_approval"
                : planPayload?.status,
          },
          onApprove: awaitingApproval
            ? options.planApprovalCallbacks?.onApprove
            : undefined,
          approveLabel: awaitingApproval
            ? options.planApprovalCallbacks?.approveLabel
            : undefined,
          approved: planApproved,
        },
      } as UIMessage["parts"][number];
    }

    case "text":
      if (!block.text.trim()) return null;
      return { type: "text", text: block.text };

    case "form_question":
      return mapFormQuestionPart(
        block,
        options.run,
        options.clarificationCallbacks,
        options.questionAnswerHandler,
      ) as UIMessage["parts"][number];

    case "output": {
      const payload = block.payload;
      const agentId =
        typeof payload.agentId === "string"
          ? (payload.agentId as AgentUiId)
          : options.agentId;

      if (agentId === "post") {
        const canReview =
          Boolean(options.reviewCallbacks) && canReviewRun(options.run);
        return buildPostPart(
          options.run,
          payload,
          canReview ? (options.reviewCallbacks ?? null) : null,
        ) as UIMessage["parts"][number];
      }

      if (
        options.reviewCallbacks &&
        canReviewRun(options.run) &&
        options.run.status === "COMPLETED"
      ) {
        return buildReviewPart(
          options.agentId,
          options.run,
          options.reviewCallbacks,
        ) as UIMessage["parts"][number];
      }

      return buildOutputPart(
        options.agentId,
        payload,
      ) as UIMessage["parts"][number];
    }

    case "error": {
      const message =
        typeof block.payload.message === "string"
          ? block.payload.message
          : block.text || "Não foi possível concluir a geração.";
      return {
        type: "error",
        message,
        title: "Erro",
      } as unknown as UIMessage["parts"][number];
    }

    default:
      return null;
  }
};

const findLastAssistantIndex = (messages: MessageState[]): number => {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "assistant") return index;
  }
  return -1;
};

const hasTerminalAssistantBlock = (messages: MessageState[]): boolean =>
  messages.some(
    (message) =>
      message.role === "assistant" &&
      message.blocks.some(
        (block) => block.blockType === "output" || block.blockType === "error",
      ),
  );

const ensureTerminalAssistantBlocks = (
  messages: MessageState[],
  run: AgentRunStatusDto,
  agentId: AgentUiId,
): MessageState[] => {
  if (hasTerminalAssistantBlock(messages)) return messages;

  if (run.status === "FAILED" && run.errorMessage) {
    const lastAssistantIndex = findLastAssistantIndex(messages);
    const errorBlock: BlockState = {
      blockId: `${run.id}:synthetic-error`,
      blockType: "error",
      index: 0,
      text: run.errorMessage,
      payload: { message: run.errorMessage },
      status: "error",
    };

    if (lastAssistantIndex >= 0) {
      const assistant = messages[lastAssistantIndex];
      return messages.map((message, index) =>
        index === lastAssistantIndex
          ? {
              ...assistant,
              blocks: [
                ...assistant.blocks,
                { ...errorBlock, index: assistant.blocks.length },
              ],
            }
          : message,
      );
    }

    return [
      ...messages,
      {
        messageId: `${run.id}:synthetic-assistant`,
        role: "assistant" as const,
        blocks: [errorBlock],
      },
    ];
  }

  if (run.status !== "COMPLETED") return messages;

  const outputBlock: BlockState = {
    blockId: `${run.id}:synthetic-output`,
    blockType: "output",
    index: 0,
    text: "",
    payload: {
      agentId,
      ...(run.outputPayload as Record<string, unknown>),
    },
    status: "complete",
  };

  const lastAssistantIndex = findLastAssistantIndex(messages);

  if (lastAssistantIndex >= 0) {
    const assistant = messages[lastAssistantIndex];
    return messages.map((message, index) =>
      index === lastAssistantIndex
        ? {
            ...assistant,
            blocks: [
              ...assistant.blocks,
              { ...outputBlock, index: assistant.blocks.length },
            ],
          }
        : message,
    );
  }

  return [
    ...messages,
    {
      messageId: `${run.id}:synthetic-assistant`,
      role: "assistant" as const,
      blocks: [outputBlock],
    },
  ];
};

const shouldHideStreamingTextPart = (
  message: MessageState,
  block: BlockState,
): boolean => {
  if (block.blockType !== "text") return false;
  const hasOutput = message.blocks.some(
    (entry) => entry.blockType === "output" && entry.status === "complete",
  );
  if (hasOutput) return true;
  return looksLikeStructuredPayload(block.text);
};

/** Maps every option id seen in form questions to its human label (e.g. linkedin → LinkedIn). */
const buildOptionLabelMap = (messages: MessageState[]): Map<string, string> => {
  const map = new Map<string, string>();
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block.blockType !== "form_question") continue;
      const schema = block.payload.formSchema as {
        fields?: Array<{ options?: Array<{ id: string; label: string }> }>;
      } | null;
      for (const field of schema?.fields ?? []) {
        for (const option of field.options ?? []) {
          if (option?.id) map.set(option.id, option.label ?? option.id);
        }
      }
    }
  }
  return map;
};

type UserAnswerClassification =
  | { kind: "prompt" }
  | { kind: "fieldAnswer"; text: string }
  | { kind: "confirmation" };

/**
 * Classifies a user message: the initial prompt, a form-field answer (kept as a
 * chat bubble, prettified to the option label) or a boolean confirmation such as
 * design-plan approval (hidden — it carries no conversational meaning).
 */
const classifyUserMessage = (
  message: MessageState,
  run: AgentRunStatusDto,
): UserAnswerClassification => {
  const textBlock = message.blocks.find((block) => block.blockType === "text");
  if (!textBlock || message.blocks.length !== 1) return { kind: "prompt" };

  const text = textBlock.text.trim();
  if (!text) return { kind: "prompt" };

  const userInput = getRunUserInput(run).trim();
  if (text === userInput) return { kind: "prompt" };

  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(inputPayload)) {
    if (key === "userInput" || key === "conversationHistory") continue;
    if (typeof value === "boolean" && String(value) === text) {
      return { kind: "confirmation" };
    }
    if (typeof value === "string" && value.trim() === text) {
      return { kind: "fieldAnswer", text };
    }
  }

  return { kind: "prompt" };
};

export type BuildMessagesFromBlocksOptions = {
  agentId: AgentUiId;
  run: AgentRunStatusDto;
  messages: MessageState[];
  reviewCallbacks?: ReviewCallbacks | null;
  clarificationCallbacks?: ClarificationCallbacks | null;
  planApprovalCallbacks?: PlanApprovalCallbacks | null;
  questionAnswerHandler?: QuestionAnswerHandler | null;
  rejectQuestion?: boolean;
  regenerateQuestion?: boolean;
  editQuestion?: { caption: string } | null;
};

export const buildMessagesFromBlocks = ({
  agentId,
  run,
  messages,
  reviewCallbacks,
  clarificationCallbacks,
  planApprovalCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: BuildMessagesFromBlocksOptions): UIMessage[] => {
  const uiMessages: UIMessage[] = [];
  const lastAssistantMessageId = [...messages]
    .reverse()
    .find((entry) => entry.role === "assistant")?.messageId;
  const optionLabelMap = buildOptionLabelMap(messages);

  for (const message of messages) {
    if (message.role === "user") {
      const classification = classifyUserMessage(message, run);
      // Boolean confirmations (e.g. design-plan approval) aren't shown as chat.
      if (classification.kind === "confirmation") {
        continue;
      }
      // Keep the user's form answer as their own message bubble, prettified to
      // the chosen option's label so it reads naturally in the conversation.
      if (classification.kind === "fieldAnswer") {
        const label =
          optionLabelMap.get(classification.text) ?? classification.text;
        uiMessages.push({
          id: `${message.role}-${message.messageId}`,
          role: "user",
          parts: [{ type: "text", text: label }],
        });
        continue;
      }
    }

    const parts = message.blocks
      .filter((block) => !shouldHideStreamingTextPart(message, block))
      .map((block) =>
        mapBlockToPart(block, {
          agentId,
          run,
          reviewCallbacks,
          clarificationCallbacks,
          planApprovalCallbacks,
          questionAnswerHandler,
        }),
      )
      .filter((part): part is UIMessage["parts"][number] => Boolean(part));

    const isLastAssistant =
      message.role === "assistant" &&
      message.messageId === lastAssistantMessageId;

    if (isLastAssistant && rejectQuestion) {
      parts.push(
        buildInteractiveQuestionPart(
          `reject-${run.id}`,
          {
            kind: "text",
            title: "Por que você está negando este resultado?",
            placeholder: "Ex.: tom muito formal, hashtags irrelevantes...",
          },
          questionAnswerHandler,
        ) as UIMessage["parts"][number],
      );
    }

    if (isLastAssistant && regenerateQuestion) {
      parts.push(
        buildInteractiveQuestionPart(
          `regenerate-${run.id}`,
          {
            kind: "text",
            title: "O que deve mudar na nova versão?",
            placeholder: "Opcional — descreva o ajuste desejado",
          },
          questionAnswerHandler,
        ) as UIMessage["parts"][number],
      );
    }

    if (isLastAssistant && editQuestion) {
      parts.push(
        buildInteractiveQuestionPart(
          `edit-${run.id}`,
          {
            kind: "text",
            title: "Edite a legenda",
            placeholder: "Edite a legenda do post",
          },
          questionAnswerHandler,
          editQuestion.caption,
        ) as UIMessage["parts"][number],
      );
    }

    if (parts.length === 0) continue;

    uiMessages.push({
      id: `${message.role}-${message.messageId}`,
      role: message.role,
      parts,
    });
  }

  return uiMessages;
};

export type LegacyFallbackOptions = BuildMessagesFromBlocksOptions & {
  optimisticUserInput?: string | null;
};

/** Fallback for runs persisted before block streaming (empty `blocks`). */
export const buildLegacyRunMessages = ({
  agentId,
  run,
  optimisticUserInput,
  reviewCallbacks,
  planApprovalCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: LegacyFallbackOptions): UIMessage[] => {
  const userInput = getRunUserInput(run) || optimisticUserInput?.trim() || "";
  const messages: MessageState[] = [];

  if (userInput) {
    messages.push({
      messageId: `${run.id}:legacy-user`,
      role: "user",
      blocks: [
        {
          blockId: `${run.id}:legacy-user:b0`,
          blockType: "text",
          index: 0,
          text: userInput,
          payload: {},
          status: "complete",
        },
      ],
    });
  }

  const assistantBlocks: BlockState[] = [];

  if (run.status === "FAILED" && run.errorMessage) {
    assistantBlocks.push({
      blockId: `${run.id}:legacy-error`,
      blockType: "error",
      index: 0,
      text: run.errorMessage,
      payload: { message: run.errorMessage },
      status: "error",
    });
  }

  if (run.status === "COMPLETED") {
    assistantBlocks.push({
      blockId: `${run.id}:legacy-output`,
      blockType: "output",
      index: assistantBlocks.length,
      text: "",
      payload: {
        agentId,
        ...(run.outputPayload as Record<string, unknown>),
      },
      status: "complete",
    });
  }

  const pauseSchema = run.pauseFormSchema as { type?: string } | null;
  const isDesignPlanApprovalPause =
    run.status === "PAUSED" &&
    pauseSchema?.type === DESIGN_PLAN_APPROVAL_PAUSE_TYPE;

  if (run.status === "PAUSED" && !isDesignPlanApprovalPause) {
    assistantBlocks.push({
      blockId: `${run.id}:legacy-form`,
      blockType: "form_question",
      index: assistantBlocks.length,
      text: "",
      payload: {
        formSchema: run.pauseFormSchema ?? { fields: [] },
      },
      status: "complete",
    });
  }

  if (assistantBlocks.length > 0) {
    messages.push({
      messageId: `${run.id}:legacy-assistant`,
      role: "assistant",
      blocks: assistantBlocks,
    });
  }

  return buildMessagesFromBlocks({
    agentId,
    run,
    messages,
    reviewCallbacks,
    clarificationCallbacks:
      run.status === "PAUSED" && !isDesignPlanApprovalPause
        ? {
            onAnswer: (answer) =>
              questionAnswerHandler?.({
                toolCallId: `clarify-${run.id}`,
                answer,
              }),
          }
        : null,
    planApprovalCallbacks,
    questionAnswerHandler,
    rejectQuestion,
    regenerateQuestion,
    editQuestion,
  });
};

export type ThreadBlockRunEntry = {
  run: AgentRunStatusDto;
  messages: MessageState[];
  hasBlocks: boolean;
};

export const buildThreadMessagesFromBlocks = ({
  agentId,
  runs,
  activeRunId,
  optimisticUserInput,
  reviewCallbacks,
  clarificationCallbacks,
  planApprovalCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: {
  agentId: AgentUiId;
  runs: ThreadBlockRunEntry[];
  activeRunId: string | null;
  optimisticUserInput?: string | null;
  reviewCallbacks?: ReviewCallbacks | null;
  clarificationCallbacks?: ClarificationCallbacks | null;
  planApprovalCallbacks?: PlanApprovalCallbacks | null;
  questionAnswerHandler?: QuestionAnswerHandler | null;
  rejectQuestion?: boolean;
  regenerateQuestion?: boolean;
  editQuestion?: { caption: string } | null;
}): UIMessage[] => {
  const messages: UIMessage[] = [];
  const seenRunIds = new Set<string>();

  for (const entry of runs) {
    if (seenRunIds.has(entry.run.id)) continue;
    seenRunIds.add(entry.run.id);

    const isActive = entry.run.id === activeRunId;
    const showReviewActions =
      isActive ||
      (entry.run.status === "COMPLETED" &&
        entry.run.reviewStatus === "PENDING_REVIEW");

    if (!entry.hasBlocks && entry.messages.length === 0) {
      messages.push(
        ...buildLegacyRunMessages({
          agentId,
          run: entry.run,
          messages: [],
          optimisticUserInput: isActive ? optimisticUserInput : null,
          reviewCallbacks: showReviewActions ? reviewCallbacks : null,
          clarificationCallbacks: isActive ? clarificationCallbacks : null,
          planApprovalCallbacks: isActive ? planApprovalCallbacks : null,
          questionAnswerHandler: isActive ? questionAnswerHandler : null,
          rejectQuestion: isActive ? rejectQuestion : false,
          regenerateQuestion: isActive ? regenerateQuestion : false,
          editQuestion: isActive ? editQuestion : null,
        }),
      );
      continue;
    }

    const normalizedMessages = ensureTerminalAssistantBlocks(
      entry.messages,
      entry.run,
      agentId,
    );

    messages.push(
      ...buildMessagesFromBlocks({
        agentId,
        run: entry.run,
        messages: normalizedMessages,
        reviewCallbacks: showReviewActions ? reviewCallbacks : null,
        clarificationCallbacks: isActive ? clarificationCallbacks : null,
        planApprovalCallbacks: isActive ? planApprovalCallbacks : null,
        questionAnswerHandler: isActive ? questionAnswerHandler : null,
        rejectQuestion: isActive ? rejectQuestion : false,
        regenerateQuestion: isActive ? regenerateQuestion : false,
        editQuestion: isActive ? editQuestion : null,
      }),
    );
  }

  if (messages.length === 0 && optimisticUserInput?.trim()) {
    return [
      {
        id: "optimistic-user",
        role: "user",
        parts: [{ type: "text", text: optimisticUserInput.trim() }],
      },
    ];
  }

  return messages;
};

export type { ReviewStatus };
