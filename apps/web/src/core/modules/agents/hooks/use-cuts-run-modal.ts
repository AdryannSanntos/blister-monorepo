"use client";

import type { CutsProcessingTimeframe, CutsRunOptions, CutsVideoGenre } from "@company-os/types";
import { cutsAgentSettingsSchema } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  useFilePreviewUrl,
  useUploadWorkspaceFile,
} from "src/core/modules/files/hooks/use-files-api";
import { useStartAgentRun } from "./use-agent-run-mutations";
import { cutsRunsQueryKey } from "./use-cuts-runs";
import { useCutsSettings } from "./use-cuts-settings";
import { cutsStatsQueryKey } from "./use-cuts-stats";

const CUTS_AGENT_ID = "cuts";

export type CutsLocalRunOptions = {
  modelTier: "basic";
  videoGenre?: CutsVideoGenre;
  processingTimeframe?: CutsProcessingTimeframe;
};

const defaultRunOptions = (): CutsLocalRunOptions => ({
  modelTier: "basic",
});

const defaultSettings = () => cutsAgentSettingsSchema.parse({});

export const useCutsRunModal = () => {
  const queryClient = useQueryClient();
  const tModal = useTranslations("cuts.modal");

  const [open, setOpen] = useState(false);
  const [pendingLocalFile, setPendingLocalFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFileSize, setSourceFileSize] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runOptions, setRunOptions] = useState<CutsLocalRunOptions>(defaultRunOptions);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalVariant, setStatusModalVariant] =
    useState<"success" | "error">("success");
  const [statusRunId, setStatusRunId] = useState<string | null>(null);
  const [statusSourceFileName, setStatusSourceFileName] = useState<string | null>(
    null,
  );
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(
    null,
  );

  const localPreviewUrlRef = useRef<string | null>(null);
  const closeResetTimerRef = useRef<number | null>(null);
  const sourceFileIdRef = useRef<string | null>(null);
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

  const existingFilePreview = useFilePreviewUrl(
    sourceFileId && !pendingLocalFile ? sourceFileId : null,
    Boolean(sourceFileId && !pendingLocalFile),
  );

  const hasSource = Boolean(sourceFileId || pendingLocalFile);
  const hasExistingSource = Boolean(sourceFileId) && !pendingLocalFile;
  const sourcePreviewUrl =
    localPreviewUrl ?? existingFilePreview.data?.url ?? null;

  const invalidateCutsQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: cutsRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: cutsStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", CUTS_AGENT_ID] });
  }, [queryClient]);

  const clearLocalPreview = useCallback(() => {
    if (localPreviewUrlRef.current) {
      URL.revokeObjectURL(localPreviewUrlRef.current);
      localPreviewUrlRef.current = null;
    }
    setLocalPreviewUrl(null);
  }, []);

  const resetSourceState = useCallback(() => {
    clearLocalPreview();
    setPendingLocalFile(null);
    setSourceFileId(null);
    setSourceFileName(null);
    setSourceFileSize(null);
    setUploadProgress(0);
    setIsUploading(false);
    setIsSubmitting(false);
    setErrorMessage(null);
    setRunOptions(defaultRunOptions());
  }, [clearLocalPreview]);

  const handleOpen = useCallback(() => {
    cancelCloseReset();
    resetSourceState();
    setOpen(true);
  }, [cancelCloseReset, resetSourceState]);

  const handleClose = useCallback(() => {
    setOpen(false);
    cancelCloseReset();
    closeResetTimerRef.current = window.setTimeout(() => {
      resetSourceState();
      closeResetTimerRef.current = null;
    }, 200);
  }, [cancelCloseReset, resetSourceState]);

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setStatusModalVariant("success");
    setStatusRunId(null);
    setStatusSourceFileName(null);
    setStatusErrorMessage(null);
  }, []);

  const handleRetryFromStatusModal = useCallback(() => {
    handleCloseStatusModal();
    setOpen(true);
  }, [handleCloseStatusModal]);

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

  const handleRunOptionsChange = useCallback(
    (patch: Partial<CutsLocalRunOptions>) => {
      setRunOptions((prev) => ({ ...prev, ...patch, modelTier: "basic" }));
    },
    [],
  );

  const handleStartRun = useCallback(async () => {
    if (!hasSource || isSubmitting) return;

    const runSettings = {
      ...(settings ?? defaultSettings()),
      modelTier: "basic" as const,
    };
    setErrorMessage(null);
    setIsSubmitting(true);

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

      const optionsPayload: CutsRunOptions = {};
      if (runOptions.videoGenre) optionsPayload.videoGenre = runOptions.videoGenre;
      if (runOptions.processingTimeframe) {
        optionsPayload.processingTimeframe = runOptions.processingTimeframe;
      }
      const options =
        Object.keys(optionsPayload).length > 0 ? optionsPayload : undefined;

      const response = await startRun.mutateAsync({
        userInput: sourceFileName ?? "Generate cuts",
        metadata: {
          sourceFileId: resolvedFileId,
          settings: runSettings,
          ...(options ? { options } : {}),
        },
      });

      invalidateCutsQueries();
      setOpen(false);
      setStatusModalVariant("success");
      setStatusErrorMessage(null);
      setStatusRunId(response.runId);
      setStatusSourceFileName(sourceFileName);
      setStatusModalOpen(true);
      resetSourceState();
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

      setOpen(false);
      setStatusModalVariant("error");
      setStatusRunId(null);
      setStatusSourceFileName(sourceFileName);
      setStatusErrorMessage(message);
      setStatusModalOpen(true);
      setIsUploading(false);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    hasSource,
    isSubmitting,
    settings,
    sourceFileId,
    pendingLocalFile,
    uploadFile,
    sourceFileName,
    startRun,
    invalidateCutsQueries,
    tModal,
    resetSourceState,
    runOptions,
  ]);

  useEffect(
    () => () => {
      clearLocalPreview();
      cancelCloseReset();
    },
    [clearLocalPreview, cancelCloseReset],
  );

  return {
    open,
    localFile: pendingLocalFile,
    sourceFileName,
    sourceFileSize,
    hasSource,
    hasExistingSource,
    uploadProgress,
    isUploading,
    isSubmitting,
    runOptions,
    sourcePreviewUrl,
    errorMessage,
    statusModalOpen,
    statusModalVariant,
    statusRunId,
    statusSourceFileName,
    statusErrorMessage,
    handleOpen,
    handleClose,
    handleCloseStatusModal,
    handleRetryFromStatusModal,
    handleLocalFileChange,
    handleSelectExistingFile,
    handleRunOptionsChange,
    handleStartRun,
  };
};
