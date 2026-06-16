import type { AgentRunStatus } from "@company-os/types";

/** How often to re-fetch an in-flight run as an SSE fallback (ms). */
export const ACTIVE_RUN_POLL_MS = 2500;

/** Slower poll once cuts are already visible — SSE is the primary channel. */
export const RESULTS_VISIBLE_POLL_MS = 12_000;

/**
 * Polling interval for an agent run query, used as a safety net when the SSE
 * stream drops or never connects. Only actively-executing runs are polled;
 * terminal runs (COMPLETED/FAILED/CANCELLED) and PAUSED runs (which wait on
 * human input and are driven by SSE) stop polling.
 */
export function runPollIntervalMs(
  status: AgentRunStatus | null | undefined,
): number | false {
  return status === "QUEUED" || status === "RUNNING"
    ? ACTIVE_RUN_POLL_MS
    : false;
}
