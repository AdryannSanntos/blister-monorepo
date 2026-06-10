import type {
  AgentRunEvent,
  AgentRunStatus,
  AgentRunStatusDto,
} from "@company-os/types";

import type { AgentRunWithSteps } from "../hooks/use-agent-run";
import { normalizeReviewStatus } from "./agent-run-helpers";

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
