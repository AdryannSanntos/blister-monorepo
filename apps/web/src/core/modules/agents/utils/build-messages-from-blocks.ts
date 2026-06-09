import type {
  AgentRunBlockStatus,
  AgentRunStatusDto,
  ReviewStatus,
} from "@company-os/types";
import type { UIMessage } from "ai";

import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";

import type { AgentUiId } from "../config/agent-ui-config";
import {
  canReviewRun,
  getRunUserInput,
  parsePostOutput,
} from "./agent-run-helpers";
import type { BlockState, MessageState } from "./agent-block-reducer";
import { formatAgentOutputMarkdown } from "./format-agent-output-markdown";
import {
  formatDesignPlanPreviewMarkdown,
  parseDesignPlanPreview,
} from "./format-design-plan-preview";
import type {
  ClarificationCallbacks,
  PlanApprovalCallbacks,
  QuestionAnswerHandler,
  ReviewCallbacks,
} from "./build-agent-messages";
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

const resolveFormFieldAnswer = (
  field: {
    name: string;
    kind?: "single" | "multi" | "text";
    options?: Array<{ id: string; label: string }>;
  },
  inputPayload: Record<string, unknown>,
): QuestionAnswer | null => {
  const raw = inputPayload[field.name];
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "string") {
    if (field.kind === "text") {
      return raw.trim() ? { kind: "text", text: raw } : null;
    }
    return raw.trim() ? { kind: "single", selectedIds: [raw] } : null;
  }
  if (Array.isArray(raw) && raw.length > 0) {
    return { kind: "multi", selectedIds: raw.map(String) };
  }
  return null;
};

const formatQuestionAnswerLabel = (
  question: {
    kind?: "single" | "multi" | "text";
    options?: Array<{ id: string; label: string }>;
  },
  answer: QuestionAnswer,
): string => {
  if (answer.kind === "skip") return "Pulado";
  if (answer.kind === "text") return answer.text?.trim() || "Respondido";

  const selectedIds = answer.selectedIds ?? [];
  if (selectedIds.length > 0 && question.options?.length) {
    const labels = selectedIds.map((id) => {
      const option = question.options!.find((entry) => entry.id === id);
      return option?.label ?? id;
    });
    if (answer.text?.trim()) {
      return `${labels.join(", ")} — ${answer.text.trim()}`;
    }
    return labels.join(", ");
  }

  return answer.text?.trim() || "Respondido";
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
) => ({
  type: "tool-Question" as const,
  toolCallId,
  state: "input-available" as const,
  input: {
    questions: [question],
    totalQuestions: 1,
    questionIndex: 1,
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

const buildOutputPart = (agentId: AgentUiId, outputPayload: Record<string, unknown>) => {
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
  const isInteractive = run.status === "PAUSED" && block.status === "complete";

  const resolvedAnswers = fields.flatMap((field) => {
    const answer = resolveFormFieldAnswer(field, inputPayload);
    if (!answer) return [];
    return [
      {
        question: {
          kind: field.kind ?? ("text" as const),
          title: field.label,
          description: field.description,
          options: field.options,
          placeholder: field.placeholder,
        },
        answer,
        label: formatQuestionAnswerLabel(
          {
            kind: field.kind,
            options: field.options,
          },
          answer,
        ),
      },
    ];
  });

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
    onSubmitAnswer:
      questionAnswerHandler && isInteractive
        ? (answer: QuestionAnswer) =>
            questionAnswerHandler({ toolCallId: block.blockId, answer })
        : questionInputExtras.onSubmitAnswer,
  };

  if (!isInteractive && resolvedAnswers.length > 0) {
    const primary = resolvedAnswers[0];
    return {
      type: "tool-Question" as const,
      toolCallId: block.blockId,
      state: "output-available" as const,
      input: baseInput,
      output: {
        answer: primary.answer,
        answerLabel: primary.label,
        answers: resolvedAnswers.map((entry) => ({
          title: entry.question.title,
          label: entry.label,
        })),
      },
    };
  }

  if (fields.length === 0) {
    return {
      type: "tool-Question" as const,
      toolCallId: block.blockId,
      state: isInteractive
        ? ("input-available" as const)
        : blockPartState(block.status),
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
    state: isInteractive
      ? ("input-available" as const)
      : blockPartState(block.status),
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

  switch (block.blockType) {
    case "thinking":
    case "working":
      if (block.status !== "streaming") return null;
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
        (typeof block.payload.label === "string" ? block.payload.label : undefined);
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
        (typeof block.payload.summary === "string" ? block.payload.summary : "");
      const awaitingApproval = isPostDesignPlanAwaitingApproval(options.run);
      const planApproved =
        (options.run.inputPayload as Record<string, unknown>).designPlanApproved === true;

      return {
        type: "tool-PlanWrite",
        toolCallId: block.blockId,
        state,
        input: {
          plan: {
            id: planPayload?.id ?? block.blockId,
            title: planPayload?.title ?? "Plano de design",
            summary:
              designPlan
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

      return buildOutputPart(options.agentId, payload) as UIMessage["parts"][number];
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

/** User turns persisted for form answers are already shown inside answered question cards. */
const isDuplicateFormAnswerUserMessage = (
  message: MessageState,
  run: AgentRunStatusDto,
): boolean => {
  if (
    run.status === "PAUSED" ||
    run.status === "RUNNING" ||
    run.status === "QUEUED"
  ) {
    return false;
  }

  const textBlock = message.blocks.find((block) => block.blockType === "text");
  if (!textBlock || message.blocks.length !== 1) return false;

  const text = textBlock.text.trim();
  if (!text) return false;

  const userInput = getRunUserInput(run).trim();
  if (text === userInput) return false;

  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  for (const [key, value] of Object.entries(inputPayload)) {
    if (key === "userInput" || key === "conversationHistory") continue;
    if (typeof value === "string" && value.trim() === text) return true;
    if (value === true && text === "true") return true;
    if (value === false && text === "false") return true;
  }

  return false;
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

  for (const message of messages) {
    if (message.role === "user" && isDuplicateFormAnswerUserMessage(message, run)) {
      continue;
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

    if (message.role === "assistant" && rejectQuestion) {
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

    if (message.role === "assistant" && regenerateQuestion) {
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

    if (message.role === "assistant" && editQuestion) {
      parts.push(
        buildInteractiveQuestionPart(
          `edit-${run.id}`,
          {
            kind: "text",
            title: "Edite a legenda",
            placeholder: editQuestion.caption,
          },
          questionAnswerHandler,
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
  clarificationCallbacks,
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
              questionAnswerHandler?.({ toolCallId: `clarify-${run.id}`, answer }),
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

    if (!entry.hasBlocks && entry.messages.length === 0) {
      messages.push(
        ...buildLegacyRunMessages({
          agentId,
          run: entry.run,
          messages: [],
          optimisticUserInput: isActive ? optimisticUserInput : null,
          reviewCallbacks: isActive ? reviewCallbacks : null,
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
        reviewCallbacks: isActive ? reviewCallbacks : null,
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
