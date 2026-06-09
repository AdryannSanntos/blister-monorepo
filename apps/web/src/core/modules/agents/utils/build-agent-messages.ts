/** @deprecated Chat UI now uses build-messages-from-blocks.ts (block streaming). */
import type {
  AgentRunStatusDto,
  AgentRunStepDto,
  ReviewStatus,
} from "@company-os/types";
import type { ChatStatus, UIMessage } from "ai";

import type { QuestionAnswer } from "@/components/agent-elements/question/question-prompt";

import type { AgentUiId } from "../config/agent-ui-config";
import {
  canReviewRun,
  getRunUserInput,
  isRunActive,
  parsePostOutput,
} from "./agent-run-helpers";
import { extractStreamingText } from "./extract-streaming-text";
import { formatAgentOutputMarkdown } from "./format-agent-output-markdown";
import {
  formatDesignPlanPreviewMarkdown,
  getDesignPlanStepHint,
  parseDesignPlanPreview,
} from "./format-design-plan-preview";
import {
  formatPostOnboardingAnswer,
  getAnsweredPostOnboardingFields,
  isPostDesignPlanAwaitingApproval,
  isPostOnboardingInProgress,
} from "./post-onboarding-fields";

const STEP_LABELS: Record<string, string> = {
  retrieve_context: "Analisando o Cérebro da Marca",
  collect_brief: "Definindo o briefing",
  plan_design: "Planejando o design",
  approve_design_plan: "Aguardando aprovação do plano",
  prepare_context: "Reunindo contexto da marca",
  generate_caption: "Escrevendo a legenda",
  generate_prompt: "Planejando a imagem",
  generate_image: "Gerando a imagem",
  generate_post: "Gerando o post",
  generate_plan: "Montando o plano",
  generate_topics: "Definindo os tópicos",
  validate_output: "Revisando o resultado",
};

function friendlyStepLabel(stepKey: string | null | undefined): string {
  if (!stepKey) return "Gerando resultado";
  return STEP_LABELS[stepKey] ?? stepKey.replace(/_/g, " ");
}

export type ReviewCallbacks = {
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
};

export type ClarificationCallbacks = {
  onAnswer: (answer: QuestionAnswer) => void;
  submitLabel?: string;
};

export type PlanApprovalCallbacks = {
  onApprove: () => void;
  approveLabel: string;
};

export type QuestionAnswerHandler = (payload: {
  toolCallId?: string;
  answer: QuestionAnswer;
}) => void;

export type BuildAgentMessagesOptions = {
  agentId: AgentUiId;
  run: AgentRunStatusDto | null;
  steps: AgentRunStepDto[];
  streamingText?: string;
  optimisticUserInput?: string | null;
  pendingQuestion?: {
    toolCallId: string;
    questions: Array<{
      title: string;
      placeholder?: string;
    }>;
  } | null;
  reviewCallbacks?: ReviewCallbacks | null;
  clarificationCallbacks?: ClarificationCallbacks | null;
  questionAnswerHandler?: QuestionAnswerHandler | null;
  rejectQuestion?: boolean;
  regenerateQuestion?: boolean;
  editQuestion?: {
    caption: string;
  } | null;
};

function buildInteractiveQuestionPart(
  toolCallId: string,
  question: {
    kind: "single" | "multi" | "text";
    title: string;
    placeholder?: string;
    description?: string;
    options?: Array<{ id: string; label: string; description?: string }>;
  },
  questionAnswerHandler?: QuestionAnswerHandler | null,
) {
  return {
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
  };
}

const MCP_OUTPUT = "tool-mcp__user-tools__BlisterOutput";
const MCP_REVIEW = "tool-mcp__user-tools__BlisterReview";
const MCP_POST = "tool-mcp__user-tools__BlisterPost";

function stepState(
  status: AgentRunStepDto["status"],
): "input-streaming" | "output-available" | "input-available" {
  if (status === "RUNNING") return "input-streaming";
  if (status === "COMPLETED") return "output-available";
  return "input-available";
}

function buildClarificationPart(
  run: AgentRunStatusDto,
  pendingQuestion?: BuildAgentMessagesOptions["pendingQuestion"],
  clarificationCallbacks?: ClarificationCallbacks | null,
) {
  const questionInputExtras = clarificationCallbacks
    ? {
        onSubmitAnswer: clarificationCallbacks.onAnswer,
        submitLabel: clarificationCallbacks.submitLabel,
      }
    : {};
  if (pendingQuestion) {
    return {
      type: "tool-Question" as const,
      toolCallId: pendingQuestion.toolCallId,
      state: "input-available" as const,
      input: {
        questions: pendingQuestion.questions.map((question) => ({
          kind: "text" as const,
          title: question.title,
          placeholder: question.placeholder,
        })),
        totalQuestions: pendingQuestion.questions.length,
        questionIndex: 1,
        ...questionInputExtras,
      },
    };
  }

  const schema = run.pauseFormSchema as {
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

  const fields = schema?.fields ?? [];
  if (fields.length === 0) {
    return {
      type: "tool-Question" as const,
      toolCallId: `clarify-${run.id}`,
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
    toolCallId: `clarify-${run.id}`,
    state: "input-available" as const,
    input: {
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
    },
  };
}

function buildReviewPart(
  agentId: AgentUiId,
  run: AgentRunStatusDto,
  reviewCallbacks: ReviewCallbacks,
) {
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
}

function buildPostPart(
  run: AgentRunStatusDto,
  reviewCallbacks: ReviewCallbacks | null,
) {
  const output = parsePostOutput(run.outputPayload);
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
}

function buildOutputPart(agentId: AgentUiId, run: AgentRunStatusDto) {
  const markdown = formatAgentOutputMarkdown(agentId, run.outputPayload);
  return {
    type: MCP_OUTPUT,
    toolCallId: `output-${run.id}`,
    state: "output-available" as const,
    input: { markdown },
    output: { markdown },
  };
}

function buildAnsweredOnboardingQuestionPart(
  runId: string,
  field: {
    name: string;
    kind: "single" | "text";
    label: string;
    options?: Array<{ id: string; label: string }>;
  },
  value: string,
) {
  return {
    type: "tool-Question" as const,
    toolCallId: `onboarding-${runId}-${field.name}`,
    state: "output-available" as const,
    input: {
      questions: [
        {
          kind: field.kind,
          title: field.label,
          options: field.options,
        },
      ],
      totalQuestions: 1,
      questionIndex: 1,
    },
    output: {
      answer:
        field.kind === "single"
          ? { kind: "single" as const, selectedIds: [value] }
          : { kind: "text" as const, text: value },
    },
  };
}

function buildRunningStepThought(
  step: AgentRunStepDto,
  run: AgentRunStatusDto,
  streamingPreview: string,
): string {
  const label = friendlyStepLabel(step.stepKey);
  const hint = getDesignPlanStepHint(step.stepKey);
  const lines = [label];

  if (hint) {
    lines.push(hint);
  }

  if (streamingPreview && run.currentStepKey === step.stepKey) {
    lines.push(streamingPreview);
  }

  return lines.join("\n\n");
}

function buildDesignPlanPreviewPart(steps: AgentRunStepDto[]) {
  const planStep = steps.find(
    (step) => step.stepKey === "plan_design" && step.status === "COMPLETED",
  );
  const plan = parseDesignPlanPreview(planStep?.outputPayload?.designPlan);
  if (!plan) return null;

  return {
    type: "text" as const,
    text: formatDesignPlanPreviewMarkdown(plan),
  };
}

const POST_WORKFLOW_STEP_KEYS = [
  "retrieve_context",
  "collect_brief",
  "plan_design",
  "approve_design_plan",
  "generate_post",
  "validate_output",
] as const;

function buildStepThinkingPart(
  stepKey: string,
  step: AgentRunStepDto | null,
  run: AgentRunStatusDto,
  options: { streamingPreview: string; isPending: boolean },
): UIMessage["parts"][number] {
  const isRunning = step?.status === "RUNNING" || options.isPending;
  const toolCallId = step?.id ?? `pending-${run.id}-${stepKey}`;

  if (isRunning) {
    const thought = step
      ? buildRunningStepThought(step, run, options.streamingPreview)
      : [friendlyStepLabel(stepKey), getDesignPlanStepHint(stepKey)]
          .filter(Boolean)
          .join("\n\n") || friendlyStepLabel(stepKey);

    return {
      type: "tool-Thinking",
      toolCallId,
      state: "input-streaming",
      input: { thought },
    } as UIMessage["parts"][number];
  }

  return {
    type: "tool-Thinking",
    toolCallId,
    state: stepState(step?.status ?? "COMPLETED"),
    input: { thought: friendlyStepLabel(stepKey) },
  } as UIMessage["parts"][number];
}

function buildOrderedPostWorkflowParts(
  run: AgentRunStatusDto,
  steps: AgentRunStepDto[],
  options: { streamingText?: string; onboardingActive: boolean },
): UIMessage["parts"] {
  const parts: UIMessage["parts"] = [];
  const stepsByKey = new Map(steps.map((step) => [step.stepKey, step]));
  const streamingPreview =
    isRunActive(run.status) && run.status !== "PAUSED"
      ? extractStreamingText(options.streamingText)
      : "";
  const designPlanPreview = buildDesignPlanPreviewPart(steps);
  const currentStepIndex = run.currentStepKey
    ? POST_WORKFLOW_STEP_KEYS.indexOf(
        run.currentStepKey as (typeof POST_WORKFLOW_STEP_KEYS)[number],
      )
    : -1;

  for (const stepKey of POST_WORKFLOW_STEP_KEYS) {
    if (options.onboardingActive && stepKey === "collect_brief") continue;

    const step = stepsByKey.get(stepKey) ?? null;
    const stepIndex = POST_WORKFLOW_STEP_KEYS.indexOf(stepKey);
    const hasStarted =
      Boolean(step) ||
      (isRunActive(run.status) &&
        run.status !== "PAUSED" &&
        !options.onboardingActive &&
        currentStepIndex >= 0 &&
        stepIndex <= currentStepIndex);

    if (!hasStarted) continue;

    const isPending =
      !step &&
      run.currentStepKey === stepKey &&
      isRunActive(run.status) &&
      run.status !== "PAUSED";

    parts.push(
      buildStepThinkingPart(stepKey, step, run, {
        streamingPreview,
        isPending,
      }),
    );

    if (stepKey === "plan_design" && designPlanPreview) {
      parts.push(designPlanPreview as UIMessage["parts"][number]);
    }
  }

  return parts;
}

function buildOrderedStepThinkingParts(
  run: AgentRunStatusDto,
  steps: AgentRunStepDto[],
  streamingPreview: string,
): UIMessage["parts"] {
  const parts: UIMessage["parts"] = [];
  const stepsByKey = new Map(steps.map((step) => [step.stepKey, step]));
  const sortedSteps = [...steps].sort((a, b) => a.stepIndex - b.stepIndex);

  for (const step of sortedSteps) {
    parts.push(
      buildStepThinkingPart(step.stepKey, step, run, {
        streamingPreview,
        isPending: false,
      }),
    );
  }

  if (
    isRunActive(run.status) &&
    run.status !== "PAUSED" &&
    run.currentStepKey &&
    !stepsByKey.has(run.currentStepKey)
  ) {
    parts.push(
      buildStepThinkingPart(run.currentStepKey, null, run, {
        streamingPreview,
        isPending: true,
      }),
    );
  }

  return parts;
}

function buildPostAgentMessages({
  run,
  steps,
  streamingText,
  optimisticUserInput,
  pendingQuestion,
  reviewCallbacks,
  clarificationCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: Omit<BuildAgentMessagesOptions, "agentId" | "run"> & {
  run: AgentRunStatusDto;
}): UIMessage[] {
  const messages: UIMessage[] = [];
  const inputPayload = (run.inputPayload ?? {}) as Record<string, unknown>;
  const userInput = getRunUserInput(run) || optimisticUserInput?.trim() || "";
  const onboardingActive = isPostOnboardingInProgress(run);

  if (userInput) {
    messages.push({
      id: `user-${run.id}-initial`,
      role: "user",
      parts: [{ type: "text", text: userInput }],
    });
  }

  for (const { field, value } of getAnsweredPostOnboardingFields(inputPayload)) {
    const answerLabel = formatPostOnboardingAnswer(field, value);

    messages.push({
      id: `assistant-${run.id}-q-${field.name}`,
      role: "assistant",
      parts: [
        buildAnsweredOnboardingQuestionPart(
          run.id,
          field,
          value,
        ) as UIMessage["parts"][number],
      ],
    });

    messages.push({
      id: `user-${run.id}-a-${field.name}`,
      role: "user",
      parts: [{ type: "text", text: answerLabel }],
    });
  }

  const assistantTailParts: UIMessage["parts"] = [
    ...buildOrderedPostWorkflowParts(run, steps, {
      streamingText,
      onboardingActive,
    }),
  ];

  if (run.status === "PAUSED" && !isPostDesignPlanAwaitingApproval(run)) {
    assistantTailParts.push(
      buildClarificationPart(
        run,
        pendingQuestion,
        clarificationCallbacks,
      ) as UIMessage["parts"][number],
    );
  }

  if (run.status === "FAILED") {
    assistantTailParts.push({
      type: "text",
      text: run.errorMessage ?? "Não foi possível concluir a geração.",
    });
  }

  if (run.status === "COMPLETED") {
    const canReview = Boolean(reviewCallbacks) && canReviewRun(run);

    assistantTailParts.push(
      buildPostPart(
        run,
        canReview ? (reviewCallbacks ?? null) : null,
      ) as UIMessage["parts"][number],
    );
  }

  if (rejectQuestion) {
    assistantTailParts.push(
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

  if (regenerateQuestion) {
    assistantTailParts.push(
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

  if (editQuestion) {
    assistantTailParts.push(
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

  if (assistantTailParts.length > 0) {
    messages.push({
      id: `assistant-${run.id}-response`,
      role: "assistant",
      parts: assistantTailParts,
    });
  }

  return messages;
}

export function buildAgentMessages({
  agentId,
  run,
  steps,
  streamingText,
  optimisticUserInput,
  pendingQuestion,
  reviewCallbacks,
  clarificationCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: BuildAgentMessagesOptions): UIMessage[] {
  if (!run) {
    const messages: UIMessage[] = [];
    if (optimisticUserInput?.trim()) {
      messages.push({
        id: "optimistic-user",
        role: "user",
        parts: [{ type: "text", text: optimisticUserInput.trim() }],
      });
    }
    return messages;
  }

  if (agentId === "post") {
    return buildPostAgentMessages({
      run,
      steps,
      streamingText,
      optimisticUserInput,
      pendingQuestion,
      reviewCallbacks,
      clarificationCallbacks,
      questionAnswerHandler,
      rejectQuestion,
      regenerateQuestion,
      editQuestion,
    });
  }

  const messages: UIMessage[] = [];
  const userInput = getRunUserInput(run) || optimisticUserInput?.trim() || "";

  if (userInput) {
    messages.push({
      id: `user-${run.id}`,
      role: "user",
      parts: [{ type: "text", text: userInput }],
    });
  }

  const assistantParts: UIMessage["parts"] = [];
  const streamingPreview =
    isRunActive(run.status) && run.status !== "PAUSED"
      ? extractStreamingText(streamingText)
      : "";

  if (isRunActive(run.status)) {
    assistantParts.push(
      ...buildOrderedStepThinkingParts(run, steps, streamingPreview),
    );
  }

  if (run.status === "PAUSED") {
    assistantParts.push(
      buildClarificationPart(
        run,
        pendingQuestion,
        clarificationCallbacks,
      ) as UIMessage["parts"][number],
    );
  }

  if (run.status === "FAILED") {
    assistantParts.push({
      type: "text",
      text: run.errorMessage ?? "Não foi possível concluir a geração.",
    });
  }

  if (run.status === "COMPLETED") {
    const canReview = Boolean(reviewCallbacks) && canReviewRun(run);

    if (canReview) {
      assistantParts.push(
        buildReviewPart(
          agentId,
          run,
          reviewCallbacks as ReviewCallbacks,
        ) as UIMessage["parts"][number],
      );
    } else {
      assistantParts.push(
        buildOutputPart(agentId, run) as UIMessage["parts"][number],
      );

      if (run.reviewStatus === "APPROVED") {
        assistantParts.push({
          type: "text",
          text: "✓ Resultado aprovado.",
        });
      } else if (run.reviewStatus === "REJECTED") {
        assistantParts.push({
          type: "text",
          text: "Resultado negado. Você pode pedir uma nova versão.",
        });
      }
    }
  }

  if (rejectQuestion) {
    assistantParts.push(
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

  if (regenerateQuestion) {
    assistantParts.push(
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

  if (editQuestion) {
    assistantParts.push(
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

  if (assistantParts.length > 0) {
    messages.push({
      id: `assistant-${run.id}`,
      role: "assistant",
      parts: assistantParts,
    });
  }

  return messages;
}

export function resolveChatStatus(
  run: AgentRunStatusDto | null,
  isStarting: boolean,
  optimisticUserInput?: string | null,
): ChatStatus {
  if (isStarting || optimisticUserInput?.trim()) return "submitted";
  if (!run) return "ready";
  if (run.status === "FAILED") return "error";
  if (run.status === "PAUSED") return "ready";
  if (isRunActive(run.status)) {
    return run.status === "RUNNING" ? "streaming" : "submitted";
  }
  return "ready";
}

export type ThreadRunEntry = {
  run: AgentRunStatusDto;
  steps: AgentRunStepDto[];
  streamingText?: string;
};

export function buildThreadMessages({
  agentId,
  runs,
  activeRunId,
  optimisticUserInput,
  reviewCallbacks,
  clarificationCallbacks,
  questionAnswerHandler,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: {
  agentId: AgentUiId;
  runs: ThreadRunEntry[];
  activeRunId: string | null;
  optimisticUserInput?: string | null;
  reviewCallbacks?: ReviewCallbacks | null;
  clarificationCallbacks?: ClarificationCallbacks | null;
  questionAnswerHandler?: QuestionAnswerHandler | null;
  rejectQuestion?: boolean;
  regenerateQuestion?: boolean;
  editQuestion?: { caption: string } | null;
}): UIMessage[] {
  const messages: UIMessage[] = [];

  for (const entry of runs) {
    const isActive = entry.run.id === activeRunId;
    const runMessages = buildAgentMessages({
      agentId,
      run: entry.run,
      steps: entry.steps,
      streamingText: isActive ? entry.streamingText : undefined,
      optimisticUserInput: isActive ? optimisticUserInput : null,
      reviewCallbacks: isActive ? reviewCallbacks : null,
      clarificationCallbacks: isActive ? clarificationCallbacks : null,
      questionAnswerHandler: isActive ? questionAnswerHandler : null,
      rejectQuestion: isActive ? rejectQuestion : false,
      regenerateQuestion: isActive ? regenerateQuestion : false,
      editQuestion: isActive ? editQuestion : null,
    });
    messages.push(...runMessages);
  }

  if (messages.length === 0 && optimisticUserInput?.trim()) {
    return buildAgentMessages({
      agentId,
      run: null,
      steps: [],
      optimisticUserInput,
    });
  }

  return messages;
}

export function getReviewStatusLabel(status: ReviewStatus | null): string {
  switch (status) {
    case "APPROVED":
      return "Aprovado";
    case "REJECTED":
      return "Negado";
    case "EDITED":
      return "Editado";
    case "PENDING_REVIEW":
      return "Aguardando aprovação";
    default:
      return "";
  }
}
