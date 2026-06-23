"use client";

import type { CutOutput } from "@company-os/types";
import { type Query, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFilePreviewUrl } from "src/core/modules/files/hooks/use-files-api";
import { shouldKeepRunStreamOpen } from "../utils/apply-agent-run-event";
import {
  extractCutsFromRun,
  extractRenderProgressFromRun,
  extractTranscriptFromRun,
  getRunSourceTitle,
  isRunAwaitingCutReview,
  readSourceFileId,
  stabilizeCutsSnapshot,
} from "../utils/cuts-run-display";
import {
  ACTIVE_RUN_POLL_MS,
  RESULTS_VISIBLE_POLL_MS,
  runPollIntervalMs,
} from "../utils/run-poll-interval";
import { type AgentRunWithSteps, useAgentRun } from "./use-agent-run";
import { useResumeAgentRun } from "./use-agent-run-mutations";
import { useAgentRunStream } from "./use-agent-run-stream";
import { cutsRunsQueryKey } from "./use-cuts-runs";
import { cutsStatsQueryKey } from "./use-cuts-stats";
import { useStableMediaUrl } from "./use-stable-media-url";

const CUTS_AGENT_ID = "cuts";

type CutDecision = "approve" | "reject";

const extractCuts = (
  runData: ReturnType<typeof useAgentRun>["data"],
): CutOutput[] => {
  if (!runData) return [];
  return extractCutsFromRun({
    run: runData.run,
    steps: runData.steps,
  });
};

export const useCutsRunDetail = (runId: string) => {
  const queryClient = useQueryClient();
  const tDetail = useTranslations("cuts.runDetail");

  const [decisions, setDecisions] = useState<Record<string, CutDecision>>({});
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [totalCuts, setTotalCuts] = useState(0);
  const [progressiveRenderedCount, setProgressiveRenderedCount] = useState(0);

  const stableCutsRef = useRef<CutOutput[]>([]);
  const cutsFingerprintRef = useRef("");

  const resumeRun = useResumeAgentRun(runId, CUTS_AGENT_ID);

  const runPollInterval = useCallback((query: Query<AgentRunWithSteps>) => {
    const status = query.state.data?.run.status;
    const pauseReason = query.state.data?.run.pauseReason;
    const baseInterval = runPollIntervalMs(status, pauseReason);
    if (baseInterval === false) return false;

    const visibleCuts = extractCuts(query.state.data);
    if (visibleCuts.length > 0) {
      const allRendered = visibleCuts.every((cut) => Boolean(cut.cutFileId));
      return allRendered ? false : RESULTS_VISIBLE_POLL_MS;
    }

    return ACTIVE_RUN_POLL_MS;
  }, []);

  const {
    data: runData,
    isLoading,
    isError,
  } = useAgentRun(runId, {
    refetchInterval: runPollInterval,
  });

  const runStatus = runData?.run.status ?? null;
  const sourceFileId = runData
    ? readSourceFileId(runData.run.inputPayload)
    : null;
  const sourceFileName = runData
    ? getRunSourceTitle(runData.run.inputPayload)
    : null;

  const awaitingCutReview = isRunAwaitingCutReview(runData?.run);
  const reviewable = awaitingCutReview;
  const isRunActive =
    runStatus === "RUNNING" ||
    runStatus === "QUEUED" ||
    (runStatus === "PAUSED" && !awaitingCutReview);

  const hasPendingRenders =
    totalCuts > 0 && progressiveRenderedCount < totalCuts;

  const shouldStream =
    Boolean(runId) &&
    (shouldKeepRunStreamOpen(runData?.run) || hasPendingRenders);

  useAgentRunStream(runId, CUTS_AGENT_ID, shouldStream);

  const cuts = useMemo(() => {
    const next = extractCuts(runData);
    return stabilizeCutsSnapshot(next, stableCutsRef, cutsFingerprintRef);
  }, [runData]);

  const transcript = useMemo(
    () => extractTranscriptFromRun({ steps: runData?.steps }),
    [runData?.steps],
  );

  useEffect(() => {
    if (!runData) return;

    const { totalCuts: progressTotal, renderedCount: progressRendered } =
      extractRenderProgressFromRun({
        run: runData.run,
        steps: runData.steps,
      });

    if (progressTotal > 0) setTotalCuts(progressTotal);
    if (progressTotal > 0) setProgressiveRenderedCount(progressRendered);
  }, [runData]);

  useEffect(() => {
    if (!selectedCutId && cuts.length > 0) {
      setSelectedCutId(cuts[0].id);
    }
  }, [selectedCutId, cuts]);

  const filePreview = useFilePreviewUrl(sourceFileId, Boolean(sourceFileId));
  const rawPlayerSrc = filePreview.data?.url ?? null;
  const playerSrc = useStableMediaUrl(sourceFileId, rawPlayerSrc);

  const selectedCut = useMemo(
    () => cuts.find((cut) => cut.id === selectedCutId) ?? cuts[0] ?? null,
    [cuts, selectedCutId],
  );

  const invalidateCutsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cutsRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: cutsStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", CUTS_AGENT_ID] });
  }, [queryClient]);

  const setDecision = useCallback((cutId: string, decision: CutDecision) => {
    setDecisions((prev) => ({ ...prev, [cutId]: decision }));
  }, []);

  const allDecided = cuts.length > 0 && cuts.every((cut) => decisions[cut.id]);
  const isSubmittingReview = resumeRun.isPending;

  const handleSubmitReview = useCallback(async () => {
    if (!reviewable || !allDecided || isSubmittingReview) return;

    const cutDecisions = cuts.map((cut) => ({
      cutId: cut.id,
      decision: decisions[cut.id],
    }));

    try {
      await resumeRun.mutateAsync({ formData: { cutDecisions } });
      invalidateCutsQueries();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : tDetail("reviewError"),
      );
    }
  }, [
    reviewable,
    allDecided,
    isSubmittingReview,
    cuts,
    decisions,
    resumeRun,
    invalidateCutsQueries,
    tDetail,
  ]);

  const resolveSourceDone =
    runData?.steps.some(
      (s) => s.stepKey === "resolve_source" && s.status === "COMPLETED",
    ) ?? false;
  const rankSegmentsDone =
    runData?.steps.some(
      (s) => s.stepKey === "rank_segments" && s.status === "COMPLETED",
    ) ?? false;

  const showProgress =
    isRunActive ||
    (cuts.length === 0 && runStatus !== "FAILED" && runStatus !== "CANCELLED");

  return {
    runData,
    isLoading,
    isError,
    sourceFileName,
    runStatus,
    isRunActive,
    showProgress,
    cuts,
    transcript,
    selectedCut,
    selectedCutId: selectedCut?.id ?? null,
    decisions,
    reviewable,
    allDecided,
    playerSrc,
    playerSrcResourceKey: sourceFileId,
    isResolvingSource: filePreview.isLoading,
    isSubmittingReview,
    errorMessage,
    totalCuts,
    progressiveRenderedCount,
    resolveSourceDone,
    rankSegmentsDone,
    setSelectedCut: setSelectedCutId,
    setDecision,
    handleSubmitReview,
  };
};
