"use client";

import type { CutOutput, CutsAgentSettings } from "@company-os/types";
import { cutsAgentSettingsSchema } from "@company-os/types";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  useFilePreviewUrl,
  useUploadWorkspaceFile,
} from "src/core/modules/files/hooks/use-files-api";
import { shouldKeepRunStreamOpen } from "../utils/apply-agent-run-event";
import { useAgentRun, type AgentRunWithSteps } from "./use-agent-run";
import { useResumeAgentRun, useStartAgentRun } from "./use-agent-run-mutations";
import { useAgentRunStream } from "./use-agent-run-stream";
import { cutsRunsQueryKey } from "./use-cuts-runs";
import { cutsSettingsQueryKey, useCutsSettings } from "./use-cuts-settings";
import { cutsStatsQueryKey } from "./use-cuts-stats";
import {
  ACTIVE_RUN_POLL_MS,
  RESULTS_VISIBLE_POLL_MS,
  runPollIntervalMs,
} from "../utils/run-poll-interval";
import {
  extractCutsFromRun,
  getRunSourceTitle,
  readSourceFileId,
  stabilizeCutsSnapshot,
} from "../utils/cuts-run-display";
import { useStableMediaUrl } from "./use-stable-media-url";

const CUTS_AGENT_ID = "cuts";

/** Phases of the cuts modal — kept minimal for the user. */
export type CutsModalPhase = "source" | "processing" | "results" | "error";

export type CutsModalIntent = "generate" | "view";

type CutDecision = "approve" | "reject";

const defaultSettings = (): CutsAgentSettings =>
  cutsAgentSettingsSchema.parse({});

/** Reads the cut list from a run snapshot. */
const extractCuts = (
  runData: ReturnType<typeof useAgentRun>["data"],
): CutOutput[] => {
  if (!runData) return [];
  return extractCutsFromRun({
    run: runData.run,
    steps: runData.steps,
  });
};

export const useCutsRunModal = () => {
  const queryClient = useQueryClient();
  const tModal = useTranslations("cuts.modal");

  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<CutsModalPhase>("source");
  const [pendingLocalFile, setPendingLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFileSize, setSourceFileSize] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, CutDecision>>({});
  const [selectedCutId, setSelectedCutId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [intent, setIntent] = useState<CutsModalIntent>("generate");
  const [bootstrapCuts, setBootstrapCuts] = useState<CutOutput[]>([]);

  const localPreviewUrlRef = useRef<string | null>(null);
  const closeResetTimerRef = useRef<number | null>(null);
  const sourceFileIdRef = useRef<string | null>(null);
  const stableCutsRef = useRef<CutOutput[]>([]);
  const cutsFingerprintRef = useRef("");
  sourceFileIdRef.current = sourceFileId;

  const cancelCloseReset = useCallback(() => {
    if (closeResetTimerRef.current) {
      clearTimeout(closeResetTimerRef.current);
      closeResetTimerRef.current = null;
    }
  }, []);

  const { data: settings } = useCutsSettings();
  const uploadFile = useUploadWorkspaceFile();
  const startRun = useStartAgentRun(CUTS_AGENT_ID);
  const resumeRun = useResumeAgentRun(runId, CUTS_AGENT_ID);

  const runPollInterval = useCallback(
    (query: Query<AgentRunWithSteps>) => {
      const status = query.state.data?.run.status;
      const baseInterval = runPollIntervalMs(status);
      if (baseInterval === false) return false;

      if (phase === "results") {
        const visibleCuts = extractCuts(query.state.data);
        if (visibleCuts.length > 0) {
          const allRendered = visibleCuts.every((cut) => Boolean(cut.cutFileId));
          return allRendered ? false : RESULTS_VISIBLE_POLL_MS;
        }
      }

      return ACTIVE_RUN_POLL_MS;
    },
    [phase],
  );

  const { data: runData } = useAgentRun(runId, {
    refetchInterval: runPollInterval,
  });

  const runStatus = runData?.run.status ?? null;
  const isTerminalRun =
    runStatus === "COMPLETED" ||
    runStatus === "FAILED" ||
    runStatus === "CANCELLED";

  const shouldStream =
    open &&
    Boolean(runId) &&
    phase !== "error" &&
    phase !== "results" &&
    intent === "generate" &&
    shouldKeepRunStreamOpen(runData?.run);

  useAgentRunStream(runId, CUTS_AGENT_ID, shouldStream);

  // Hydrate source file from a loaded run (view mode / resumed sessions).
  useEffect(() => {
    if (!runData || sourceFileId) return;
    const fromRun = readSourceFileId(runData.run.inputPayload);
    if (fromRun) setSourceFileId(fromRun);
    if (!sourceFileName) {
      setSourceFileName(getRunSourceTitle(runData.run.inputPayload));
    }
  }, [runData, sourceFileId, sourceFileName]);

  const cuts = useMemo(() => {
    const fromRun = extractCuts(runData);
    const next = fromRun.length > 0 ? fromRun : bootstrapCuts;
    return stabilizeCutsSnapshot(next, stableCutsRef, cutsFingerprintRef);
  }, [runData, bootstrapCuts]);

  const autoAccept =
    settings?.autoAcceptResults ?? defaultSettings().autoAcceptResults;
  const isPausedForReview =
    runStatus === "PAUSED" &&
    runData?.run.pauseReason === "awaiting_cut_review";
  const reviewable = isPausedForReview && !autoAccept;
  const isRunActive =
    runStatus === "RUNNING" ||
    (runStatus === "PAUSED" && !isPausedForReview);

  const hasSource = Boolean(sourceFileId || pendingLocalFile);
  const hasExistingSource = Boolean(sourceFileId) && !pendingLocalFile;
  const isSubmittingReview = resumeRun.isPending;

  // Resolve a presigned URL for an existing (non-local) source file so the
  // player can stream the original video.
  const needsRemotePreview = phase === "results" && !localPreviewUrl;
  const filePreview = useFilePreviewUrl(
    needsRemotePreview ? sourceFileId : null,
    needsRemotePreview,
  );
  const rawPlayerSrc = localPreviewUrl ?? filePreview.data?.url ?? null;
  const playerSrcResourceKey = localPreviewUrl ?? sourceFileId;
  const playerSrc = useStableMediaUrl(playerSrcResourceKey, rawPlayerSrc);

  const selectedCut = useMemo(
    () => cuts.find((cut) => cut.id === selectedCutId) ?? cuts[0] ?? null,
    [cuts, selectedCutId],
  );

  const invalidateCutsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cutsRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: cutsStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: cutsSettingsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", CUTS_AGENT_ID] });
  }, [queryClient]);

  const clearLocalPreview = useCallback(() => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  }, []);

  // Advance phase as the run progresses — show results as soon as cuts exist
  // (e.g. rank_segments done while render_cuts is still running).
  useEffect(() => {
    if (!runId || (phase !== "processing" && phase !== "results")) return;

    if (runStatus === "FAILED" || runStatus === "CANCELLED") {
      setErrorMessage(runData?.run.errorMessage ?? tModal("errorGeneric"));
      setPhase("error");
      return;
    }

    if (
      runStatus === "COMPLETED" ||
      isPausedForReview ||
      (phase === "processing" && cuts.length > 0)
    ) {
      setPhase("results");
    }
  }, [runId, phase, runStatus, isPausedForReview, cuts.length, runData, tModal]);

  // Default-select the first cut once results arrive.
  useEffect(() => {
    if (phase === "results" && !selectedCutId && cuts.length > 0) {
      setSelectedCutId(cuts[0].id);
    }
  }, [phase, selectedCutId, cuts]);

  const resetState = useCallback(() => {
    clearLocalPreview();
    stableCutsRef.current = [];
    cutsFingerprintRef.current = "";
    setPhase("source");
    setPendingLocalFile(null);
    setSourceFileId(null);
    setSourceFileName(null);
    setSourceFileSize(null);
    setUploadProgress(0);
    setIsUploading(false);
    setRunId(null);
    setDecisions({});
    setSelectedCutId(null);
    setErrorMessage(null);
    setIntent("generate");
    setBootstrapCuts([]);
  }, [clearLocalPreview]);

  const handleOpen = useCallback(() => {
    cancelCloseReset();
    resetState();
    setIntent("generate");
    setOpen(true);
  }, [cancelCloseReset, resetState]);

  const handleOpenRunDetails = useCallback(
    (params: {
      runId: string;
      sourceFileId?: string | null;
      sourceFileName?: string | null;
      initialCuts?: CutOutput[];
    }) => {
      cancelCloseReset();
      clearLocalPreview();
      setIntent("view");
      setPhase("results");
      setPendingLocalFile(null);
      setUploadProgress(0);
      setIsUploading(false);
      setDecisions({});
      setErrorMessage(null);
      setRunId(params.runId);
      setSourceFileId(params.sourceFileId ?? null);
      setSourceFileName(params.sourceFileName ?? null);
      setSourceFileSize(null);
      const seededCuts = params.initialCuts ?? [];
      setBootstrapCuts(seededCuts);
      setSelectedCutId(seededCuts[0]?.id ?? null);
      window.setTimeout(() => setOpen(true), 0);
    },
    [cancelCloseReset, clearLocalPreview],
  );

  const handleClose = useCallback(() => {
    setOpen(false);
    cancelCloseReset();
    closeResetTimerRef.current = window.setTimeout(() => {
      resetState();
      closeResetTimerRef.current = null;
    }, 200);
  }, [cancelCloseReset, resetState]);

  const handleLocalFileChange = useCallback(
    (file: File | null) => {
      clearLocalPreview();
      setPendingLocalFile(file);
      if (file) {
        const url = URL.createObjectURL(file);
        localPreviewUrlRef.current = url;
        setLocalPreviewUrl(url);
        setSourceFileId(null);
        setSourceFileName(file.name);
        setSourceFileSize(null);
      } else if (!sourceFileIdRef.current) {
        setSourceFileName(null);
        setSourceFileSize(null);
      }
      setErrorMessage(null);
    },
    [clearLocalPreview],
  );

  const handleSelectExistingFile = useCallback(
    (fileId: string, fileName: string, fileSize: string) => {
      clearLocalPreview();
      setSourceFileId(fileId);
      setPendingLocalFile(null);
      setSourceFileName(fileName);
      setSourceFileSize(fileSize);
      setErrorMessage(null);
    },
    [clearLocalPreview],
  );

  const handleStartRun = useCallback(async () => {
    if (!hasSource || phase === "processing") return;

    const runSettings = settings ?? defaultSettings();
    setErrorMessage(null);
    setPhase("processing");

    try {
      let resolvedFileId = sourceFileId;

      if (pendingLocalFile) {
        setIsUploading(true);
        setUploadProgress(0);
        const registered = await uploadFile.mutateAsync({
          file: pendingLocalFile,
          extractData: true,
          onProgress: setUploadProgress,
        });
        resolvedFileId = registered.id;
        setSourceFileId(registered.id);
        setIsUploading(false);
      }

      if (!resolvedFileId) throw new Error("No source file selected");

      const response = await startRun.mutateAsync({
        userInput: sourceFileName ?? "Generate cuts",
        metadata: {
          sourceFileId: resolvedFileId,
          settings: runSettings,
        },
      });

      setRunId(response.runId);
      invalidateCutsQueries();
    } catch (error) {
      const message =
        error instanceof Error && error.message === "FILE_TOO_LARGE"
          ? tModal("fileTooLarge")
          : error instanceof Error &&
              error.message.startsWith("S3_UPLOAD_FAILED")
            ? tModal("uploadFailed")
            : error instanceof Error
              ? error.message
              : tModal("uploadFailed");

      setErrorMessage(message);
      setIsUploading(false);
      setPhase("error");
    }
  }, [
    hasSource,
    phase,
    settings,
    sourceFileId,
    pendingLocalFile,
    uploadFile,
    sourceFileName,
    startRun,
    invalidateCutsQueries,
    tModal,
  ]);

  const setDecision = useCallback((cutId: string, decision: CutDecision) => {
    setDecisions((prev) => ({ ...prev, [cutId]: decision }));
  }, []);

  const allDecided = cuts.length > 0 && cuts.every((cut) => decisions[cut.id]);

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
        error instanceof Error ? error.message : tModal("errorGeneric"),
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
    tModal,
  ]);

  const handleRetry = useCallback(() => {
    clearLocalPreview();
    setPhase("source");
    setRunId(null);
    setErrorMessage(null);
    setUploadProgress(0);
    setIsUploading(false);
    setPendingLocalFile(null);
    setSourceFileId(null);
    setSourceFileName(null);
    setSourceFileSize(null);
    setDecisions({});
    setSelectedCutId(null);
  }, [clearLocalPreview]);

  // Cleanup object URLs on unmount.
  useEffect(
    () => () => {
      clearLocalPreview();
      cancelCloseReset();
    },
    [clearLocalPreview, cancelCloseReset],
  );

  return {
    open,
    phase,
    intent,
    localFile: pendingLocalFile,
    sourceFileName,
    sourceFileSize,
    hasSource,
    hasExistingSource,
    uploadProgress,
    isUploading,
    settings,
    autoAccept,
    cuts,
    selectedCut,
    selectedCutId: selectedCut?.id ?? null,
    decisions,
    reviewable,
    allDecided,
    playerSrc,
    playerSrcResourceKey,
    isResolvingSource: filePreview.isLoading,
    isSubmittingReview,
    runStatus,
    runCompleted: runStatus === "COMPLETED",
    isRunActive,
    errorMessage,
    handleOpen,
    handleOpenRunDetails,
    handleClose,
    handleLocalFileChange,
    handleSelectExistingFile,
    handleStartRun,
    setSelectedCut: setSelectedCutId,
    setDecision,
    handleSubmitReview,
    handleRetry,
  };
};
