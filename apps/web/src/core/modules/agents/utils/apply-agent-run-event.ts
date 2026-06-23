import type {
  AgentRunEvent,
  AgentRunStatus,
  AgentRunStatusDto,
} from "@company-os/types";

import type { AgentRunWithSteps } from "../hooks/use-agent-run";
import { normalizeReviewStatus } from "./agent-run-helpers";
import { extractCutsFromRun } from "./cuts-run-display";

const isTerminalStatus = (status: AgentRunStatus): boolean =>
  status === "COMPLETED" || status === "FAILED" || status === "CANCELLED";

/** @deprecated Step-reconstruction path — chat now reads AgentRun blocks. */
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

      const outputPayload =
        typeof data.outputPayload === "object" && data.outputPayload !== null
          ? (data.outputPayload as Record<string, unknown>)
          : run.outputPayload;

      return {
        ...current,
        run: {
          ...run,
          status: "PAUSED",
          pauseReason,
          pauseFormSchema: data.formSchema ?? data.pauseFormSchema ?? run.pauseFormSchema,
          inputPayload,
          outputPayload,
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
        run: {
          ...run,
          status: "FAILED",
          errorMessage,
          completedAt: event.timestamp,
        },
      };
    }

    case "run_cancelled":
      return {
        ...current,
        run: {
          ...run,
          status: "CANCELLED",
          completedAt: event.timestamp,
          errorMessage: null,
        },
      };

    case "step_started": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : null;
      const stepIndex = typeof data.stepIndex === "number" ? data.stepIndex : current.steps.length;
      if (!stepKey) return current;

      const existing = current.steps.find((step) => step.stepKey === stepKey);
      if (existing) {
        return {
          ...current,
          run: {
            ...run,
            status: run.status === "QUEUED" ? "RUNNING" : run.status,
            currentStepKey: stepKey,
          },
          steps: current.steps.map((step) =>
            step.stepKey === stepKey
              ? {
                  ...step,
                  status: "RUNNING" as const,
                  startedAt: step.startedAt ?? event.timestamp,
                }
              : step,
          ),
        };
      }

      return {
        ...current,
        run: {
          ...run,
          status: "RUNNING",
          currentStepKey: stepKey,
          startedAt: run.startedAt ?? event.timestamp,
        },
        steps: [
          ...current.steps,
          {
            id: `sse-${stepKey}`,
            stepKey,
            stepIndex,
            status: "RUNNING" as const,
            resultType: null,
            inputPayload: {},
            outputPayload: {},
            errorMessage: null,
            llmModel: null,
            tokensInput: null,
            tokensOutput: null,
            creditCost: null,
            startedAt: event.timestamp,
            completedAt: null,
          },
        ],
      };
    }

    case "step_completed": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : null;
      if (!stepKey) return current;

      const output =
        typeof data.output === "object" && data.output !== null
          ? (data.output as Record<string, unknown>)
          : {};

      return {
        ...current,
        steps: current.steps.map((step) =>
          step.stepKey === stepKey
            ? {
                ...step,
                status: "COMPLETED" as const,
                outputPayload: output,
                completedAt: event.timestamp,
                creditCost:
                  typeof data.creditCost === "number" ? data.creditCost : step.creditCost,
              }
            : step,
        ),
      };
    }

    case "step_failed": {
      const stepKey = typeof data.stepKey === "string" ? data.stepKey : null;
      const stepError =
        typeof data.error === "string"
          ? data.error
          : "Não foi possível concluir a etapa.";

      return {
        ...current,
        run: {
          ...run,
          status: "FAILED",
          errorMessage: stepError,
          completedAt: event.timestamp,
        },
        steps: stepKey
          ? current.steps.map((step) =>
              step.stepKey === stepKey
                ? {
                    ...step,
                    status: "FAILED" as const,
                    errorMessage: stepError,
                    completedAt: event.timestamp,
                  }
                : step,
            )
          : current.steps,
      };
    }

    case "cut_rendered": {
      const cutId = typeof data.cutId === "string" ? data.cutId : null;
      const cutFileId = typeof data.cutFileId === "string" ? data.cutFileId : null;
      if (!cutId || !cutFileId) return current;

      const currentOutput = (run.outputPayload ?? {}) as Record<string, unknown>;
      const existingCuts = Array.isArray(currentOutput.cuts)
        ? (currentOutput.cuts as Array<Record<string, unknown>>)
        : [];

      const applyCutFileId = (cuts: Array<Record<string, unknown>>) =>
        cuts.map((cut) =>
          cut.id === cutId ? { ...cut, cutFileId } : cut,
        );

      const updatedCuts =
        existingCuts.length > 0
          ? applyCutFileId(existingCuts)
          : applyCutFileId(
              extractCutsFromRun({
                run,
                steps: current.steps,
              }).map((cut) => ({ ...cut })),
            );

      return {
        ...current,
        run: {
          ...run,
          outputPayload: {
            ...currentOutput,
            cuts: updatedCuts,
            renderedCount: typeof data.renderedCount === "number" ? data.renderedCount : currentOutput.renderedCount,
            totalCuts: typeof data.totalCuts === "number" ? data.totalCuts : currentOutput.totalCuts,
          },
        },
      };
    }

    case "all_cuts_rendered": {
      const renderedCount =
        typeof data.renderedCount === "number" ? data.renderedCount : undefined;
      const totalCuts =
        typeof data.totalCuts === "number" ? data.totalCuts : undefined;
      const currentOutput = (run.outputPayload ?? {}) as Record<string, unknown>;

      return {
        ...current,
        run: {
          ...run,
          outputPayload: {
            ...currentOutput,
            ...(renderedCount !== undefined ? { renderedCount } : {}),
            ...(totalCuts !== undefined ? { totalCuts } : {}),
          },
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
  if (!run) return false;
  return !isTerminalStatus(run.status);
}
