import type { AgentRunStatusDto } from "@company-os/types";

import {
  countApprovedCuts,
  extractCutsFromRunDto,
  extractRenderProgressFromRun,
  getRunSourceTitle,
  isRunAwaitingRenders,
} from "./cuts-run-display";

export type CutsViewableRun = AgentRunStatusDto & {
  cutsCount: number;
  approvedCount: number;
  sourceTitle: string;
};

export const isProcessingRun = (
  run: Pick<AgentRunStatusDto, "status" | "pauseReason">,
): boolean =>
  run.status === "QUEUED" ||
  run.status === "RUNNING" ||
  isRunAwaitingRenders(run);

export const isViewableRun = (run: AgentRunStatusDto): boolean =>
  run.status === "COMPLETED" ||
  run.status === "PAUSED" ||
  run.status === "FAILED" ||
  run.status === "RUNNING" ||
  run.status === "QUEUED";

export const toViewableRun = (run: AgentRunStatusDto): CutsViewableRun => {
  const cuts = extractCutsFromRunDto(run);
  return {
    ...run,
    cutsCount: cuts.length,
    approvedCount: countApprovedCuts(cuts),
    sourceTitle: getRunSourceTitle(run.inputPayload),
  };
};

export const filterViewableRuns = (
  runs: AgentRunStatusDto[],
): CutsViewableRun[] => runs.filter(isViewableRun).map(toViewableRun);

/** Rough progress for overview cards while a run is still in flight. */
export const getOverviewCardProgressPercent = (
  run: AgentRunStatusDto,
): number | null => {
  if (!isProcessingRun(run)) return null;

  if (run.status === "QUEUED") return 8;

  const step = run.currentStepKey;
  if (step === "resolve_source") return 22;
  if (step === "rank_segments") return 45;

  const { totalCuts, renderedCount } = extractRenderProgressFromRun({ run });
  if (totalCuts > 0) {
    const renderShare = Math.min(1, renderedCount / totalCuts);
    return 55 + Math.round(renderShare * 40);
  }

  if (
    step === "dispatch_renders" ||
    step === "await_renders" ||
    isRunAwaitingRenders(run)
  ) {
    return 65;
  }

  if (run.status === "RUNNING") return 35;
  return 15;
};

export const hasProcessingRuns = (runs: AgentRunStatusDto[]): boolean =>
  runs.some(isProcessingRun);
