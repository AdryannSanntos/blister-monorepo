import type { AgentRunStatus } from "@company-os/types";

import { AWAITING_RENDERS } from "./cuts-run-display";

/** How often to re-fetch the overview runs list while any run is processing (ms). */
export const OVERVIEW_ACTIVE_RUNS_POLL_MS = 20_000;

/** How often to re-fetch an in-flight run as an SSE fallback (ms). */
export const ACTIVE_RUN_POLL_MS = 2500;

/** Slower poll once cuts are already visible — SSE is the primary channel. */
export const RESULTS_VISIBLE_POLL_MS = 12_000;

/**
 * Polling interval for an agent run query, used as a safety net when the SSE
 * stream drops or never connects. Actively-executing runs are polled; terminal
 * runs stop polling. PAUSED runs poll only while awaiting renders — other pause
 * reasons (e.g. cut review) wait on human input and rely on SSE.
 */
export function runPollIntervalMs(
  status: AgentRunStatus | null | undefined,
  pauseReason?: string | null,
): number | false {
  if (status === "QUEUED" || status === "RUNNING") return ACTIVE_RUN_POLL_MS;
  if (status === "PAUSED" && pauseReason === AWAITING_RENDERS) {
    return ACTIVE_RUN_POLL_MS;
  }
  return false;
}
