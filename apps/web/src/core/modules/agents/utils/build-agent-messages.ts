import type {
  AgentRunStatusDto,
  AgentRunStepDto,
  ReviewStatus,
} from "@company-os/types";
import type { ChatStatus, UIMessage } from "ai";

import type { AgentUiId } from "../config/agent-ui-config";
import { formatAgentOutputMarkdown } from "./format-agent-output-markdown";
import {
  canReviewRun,
  getRunUserInput,
  isRunActive,
} from "./agent-run-helpers";

export type ReviewCallbacks = {
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
};

export type BuildAgentMessagesOptions = {
  agentId: AgentUiId;
  run: AgentRunStatusDto | null;
  steps: AgentRunStepDto[];
  pendingQuestion?: {
    toolCallId: string;
    questions: Array<{
      title: string;
      placeholder?: string;
    }>;
  } | null;
  reviewCallbacks?: ReviewCallbacks | null;
  rejectQuestion?: boolean;
  regenerateQuestion?: boolean;
  editQuestion?: {
    caption: string;
  } | null;
};

const MCP_OUTPUT = "tool-mcp__user-tools__BlisterOutput";
const MCP_REVIEW = "tool-mcp__user-tools__BlisterReview";

function stepState(
  status: AgentRunStepDto["status"],
): "input-streaming" | "output-available" | "input-available" {
  if (status === "RUNNING") return "input-streaming";
  if (status === "COMPLETED") return "output-available";
  return "input-available";
}

function buildStepParts(steps: AgentRunStepDto[]) {
  return steps.map((step) => ({
    type: "tool-Thinking" as const,
    toolCallId: step.id,
    state: stepState(step.status),
    input: {
      thought: step.stepKey.replace(/_/g, " "),
    },
  }));
}

function buildClarificationPart(
  run: AgentRunStatusDto,
  pendingQuestion?: BuildAgentMessagesOptions["pendingQuestion"],
) {
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
      },
    };
  }

  const schema = run.pauseFormSchema as {
    fields?: Array<{
      name: string;
      label: string;
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
      },
    };
  }

  return {
    type: "tool-Question" as const,
    toolCallId: `clarify-${run.id}`,
    state: "input-available" as const,
    input: {
      questions: fields.map((field) => ({
        kind: "text" as const,
        title: field.label,
        placeholder: field.placeholder,
      })),
      totalQuestions: fields.length,
      questionIndex: 1,
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

export function buildAgentMessages({
  agentId,
  run,
  steps,
  pendingQuestion,
  reviewCallbacks,
  rejectQuestion,
  regenerateQuestion,
  editQuestion,
}: BuildAgentMessagesOptions): UIMessage[] {
  if (!run) return [];

  const userInput = getRunUserInput(run);
  const messages: UIMessage[] = [];

  if (userInput) {
    messages.push({
      id: `user-${run.id}`,
      role: "user",
      parts: [{ type: "text", text: userInput }],
    });
  }

  const assistantParts: UIMessage["parts"] = [];

  if (isRunActive(run.status) && run.status !== "PAUSED") {
    assistantParts.push(
      ...(buildStepParts(steps) as UIMessage["parts"]),
    );
  }

  if (run.status === "PAUSED") {
    assistantParts.push(
      buildClarificationPart(run, pendingQuestion) as UIMessage["parts"][number],
    );
  }

  if (run.status === "FAILED") {
    assistantParts.push({
      type: "text",
      text: run.errorMessage ?? "Não foi possível concluir a geração.",
    });
  }

  if (run.status === "COMPLETED") {
    assistantParts.push(
      buildOutputPart(agentId, run) as UIMessage["parts"][number],
    );

    if (reviewCallbacks && canReviewRun(run)) {
      assistantParts.push(
        buildReviewPart(agentId, run, reviewCallbacks) as UIMessage["parts"][number],
      );
    } else if (run.reviewStatus === "APPROVED") {
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

  if (rejectQuestion) {
    assistantParts.push({
      type: "tool-Question" as const,
      toolCallId: `reject-${run.id}`,
      state: "input-available" as const,
      input: {
        questions: [
          {
            kind: "text" as const,
            title: "Por que você está negando este resultado?",
            placeholder: "Ex.: tom muito formal, hashtags irrelevantes...",
          },
        ],
        totalQuestions: 1,
        questionIndex: 1,
      },
    } as UIMessage["parts"][number]);
  }

  if (regenerateQuestion) {
    assistantParts.push({
      type: "tool-Question" as const,
      toolCallId: `regenerate-${run.id}`,
      state: "input-available" as const,
      input: {
        questions: [
          {
            kind: "text" as const,
            title: "O que deve mudar na nova versão?",
            placeholder: "Opcional — descreva o ajuste desejado",
          },
        ],
        totalQuestions: 1,
        questionIndex: 1,
      },
    } as UIMessage["parts"][number]);
  }

  if (editQuestion) {
    assistantParts.push({
      type: "tool-Question" as const,
      toolCallId: `edit-${run.id}`,
      state: "input-available" as const,
      input: {
        questions: [
          {
            kind: "text" as const,
            title: "Edite a legenda",
            placeholder: editQuestion.caption,
          },
        ],
        totalQuestions: 1,
        questionIndex: 1,
      },
    } as UIMessage["parts"][number]);
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
): ChatStatus {
  if (isStarting) return "submitted";
  if (!run) return "ready";
  if (run.status === "FAILED") return "error";
  if (isRunActive(run.status)) {
    return run.status === "RUNNING" ? "streaming" : "submitted";
  }
  return "ready";
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
