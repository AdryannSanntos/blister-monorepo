import type {
  AgentRunEvent,
  AgentRunStatus,
  AgentRunStatusDto,
  AgentRunStepDto,
} from "@company-os/types";

import type { AgentRunWithSteps } from "../hooks/use-agent-run";
import { normalizeReviewStatus } from "./agent-run-helpers";

const isTerminalStatus = (status: AgentRunStatus): boolean =>
  status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";

const buildStep = (
  stepKey: string,
  stepIndex: number,
  status: AgentRunStepDto["status"],
  output?: Record<string, unknown>,
): AgentRunStepDto => ({
  id: `sse-${stepKey}`,
  stepKey,
  stepIndex,
  status,
  resultType: status === "COMPLETED" ? "CONTINUE" : null,
  inputPayload: {},
  outputPayload: output ?? {},
  errorMessage: null,
  llmModel: null,
  tokensInput: null,
  tokensOutput: null,
  creditCost: null,
  startedAt: new Date().toISOString(),
  completedAt: status === "COMPLETED" ? new Date().toISOString() : null,
});

export function applyAgentRunEvent(
  current: AgentRunWithSteps | undefined,
  event: AgentRunEvent,
): AgentRunWithSteps | undefined {
  if (!current) return current;

  const data = event.data ?? {};
  const run = current.run;

  switch (event.type) {
    case "run_started":
      return {
        ...current,
        run: {
          ...run,
          status: "RUNNING",
          startedAt: run.startedAt ?? event.timestamp,
          pauseReason: null,
          pauseFormSchema: null,
        },
      };

    case "output_chunk": {
      const chunk = typeof data.chunk === "string" ? data.chunk : "";
      if (!chunk) return current;
      return {
        ...current,
        run: { ...run, status: "RUNNING" },
        streamingText: (current.streamingText ?? "") + chunk,
      };
    }

    case "step_started": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : run.currentStepKey;
      const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : 0;
      if (!stepKey) return current;

      const withoutStep = current.steps.filter((step) => step.stepKey !== stepKey);

      return {
        ...current,
        streamingText: undefined,
        run: {
          ...run,
          status: "RUNNING",
          currentStepKey: stepKey,
          startedAt: run.startedAt ?? event.timestamp,
        },
        steps: [
          ...withoutStep,
          buildStep(stepKey, stepIndex, "RUNNING"),
        ],
      };
    }

    case "step_completed": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : "";
      const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : 0;
      const output =
        typeof data.output === "object" && data.output !== null
          ? (data.output as Record<string, unknown>)
          : {};

      if (!stepKey) return current;

      const withoutStep = current.steps.filter((step) => step.stepKey !== stepKey);

      return {
        ...current,
        streamingText: undefined,
        run: {
          ...run,
          status: "RUNNING",
          currentStepKey: stepKey,
        },
        steps: [
          ...withoutStep,
          buildStep(stepKey, stepIndex, "COMPLETED", output),
        ],
      };
    }

    case "step_failed": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : "";
      const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : 0;
      const error = typeof data.error === "string" ? data.error : "Step failed";

      const withoutStep = current.steps.filter((step) => step.stepKey !== stepKey);

      return {
        ...current,
        streamingText: undefined,
        run: {
          ...run,
          status: "FAILED",
          errorMessage: error,
          currentStepKey: stepKey || run.currentStepKey,
          completedAt: event.timestamp,
        },
        steps: stepKey
          ? [
              ...withoutStep,
              {
                ...buildStep(stepKey, stepIndex, "FAILED"),
                errorMessage: error,
              },
            ]
          : current.steps,
      };
    }

    case "run_paused": {
      const pauseReason =
        typeof data.reason === "string"
          ? data.reason
          : typeof data.pauseReason === "string"
            ? data.pauseReason
            : run.pauseReason;

      const inputPayload =
        typeof data.inputPayload === "object" && data.inputPayload !== null
          ? (data.inputPayload as Record<string, unknown>)
          : run.inputPayload;

      return {
        ...current,
        run: {
          ...run,
          status: "PAUSED",
          pauseReason,
          pauseFormSchema: data.formSchema ?? data.pauseFormSchema ?? run.pauseFormSchema,
          inputPayload,
        },
      };
    }

    case "run_completed": {
      const output =
        (typeof data.output === "object" && data.output !== null
          ? data.output
          : typeof data.outputPayload === "object" && data.outputPayload !== null
            ? data.outputPayload
            : run.outputPayload) as Record<string, unknown>;

      const reviewStatus = normalizeReviewStatus(
        typeof output.reviewStatus === "string" ? output.reviewStatus : "PENDING",
      );

      const creditCost =
        typeof data.totalCreditCost === "number"
          ? data.totalCreditCost
          : run.creditCost;

      return {
        ...current,
        streamingText: undefined,
        run: {
          ...run,
          status: "COMPLETED",
          outputPayload: output,
          reviewStatus,
          creditCost,
          completedAt: event.timestamp,
          errorMessage: null,
        },
      };
    }

    case "run_failed": {
      const errorMessage =
        typeof data.error === "string"
          ? data.error
          : typeof data.errorMessage === "string"
            ? data.errorMessage
            : "Não foi possível concluir a geração.";

      return {
        ...current,
        streamingText: undefined,
        run: {
          ...run,
          status: "FAILED",
          errorMessage,
          completedAt: event.timestamp,
        },
      };
    }

    default:
      return current;
  }
}

export function shouldKeepRunStreamOpen(
  run: AgentRunStatusDto | null | undefined,
): boolean {
  if (!run) return true;
  return !isTerminalStatus(run.status);
}
