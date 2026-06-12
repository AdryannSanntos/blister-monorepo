"use client";

import type { CutsAgentSettings } from "@company-os/types";
import { cutsAgentSettingsSchema } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { useUploadWorkspaceFile } from "src/core/modules/files/hooks/use-files-api";
import { useStartAgentRun } from "./use-agent-run-mutations";
import { cutsRunsQueryKey } from "./use-cuts-runs";
import { cutsSettingsQueryKey, useCutsSettings } from "./use-cuts-settings";
import { cutsStatsQueryKey } from "./use-cuts-stats";

export type CutsStatusPhase = "success" | "error";

type UseCutsRunModalOptions = {
  onCompleted?: () => void;
};

const defaultSettings = (): CutsAgentSettings => cutsAgentSettingsSchema.parse({});

export const useCutsRunModal = (options?: UseCutsRunModalOptions) => {
  const queryClient = useQueryClient();
  const tModal = useTranslations("cuts.modal");

  const [sourceOpen, setSourceOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusPhase, setStatusPhase] = useState<CutsStatusPhase>("success");
  const [runId, setRunId] = useState<string | null>(null);
  const [sourceFileId, setSourceFileId] = useState<string | null>(null);
  const [sourceFileName, setSourceFileName] = useState<string | null>(null);
  const [sourceFileSize, setSourceFileSize] = useState<string | null>(null);
  const [pendingLocalFile, setPendingLocalFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: settings } = useCutsSettings();
  const uploadFile = useUploadWorkspaceFile();
  const startRun = useStartAgentRun("cuts");

  const hasSource = Boolean(sourceFileId || pendingLocalFile);
  const hasExistingSource = Boolean(sourceFileId);

  const invalidateCutsQueries = () => {
    queryClient.invalidateQueries({ queryKey: cutsRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: cutsStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: cutsSettingsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", "cuts"] });
  };

  const handleOpen = () => {
    setSourceOpen(true);
    setStatusOpen(false);
    setStatusPhase("success");
    setRunId(null);
    setSourceFileId(null);
    setSourceFileName(null);
    setSourceFileSize(null);
    setPendingLocalFile(null);
    setErrorMessage(null);
  };

  const handleCloseSource = () => {
    if (isSubmitting) return;
    setSourceOpen(false);
  };

  const handleCloseStatus = () => {
    setStatusOpen(false);
  };

  const handleLocalFileChange = (file: File | null) => {
    setPendingLocalFile(file);
    if (file) {
      setSourceFileId(null);
      setSourceFileName(file.name);
      setSourceFileSize(null);
    } else if (!sourceFileId) {
      setSourceFileName(null);
      setSourceFileSize(null);
    }
    setErrorMessage(null);
  };

  const handleSelectExistingFile = (fileId: string, fileName: string, fileSize: string) => {
    setSourceFileId(fileId);
    setPendingLocalFile(null);
    setSourceFileName(fileName);
    setSourceFileSize(fileSize);
    setErrorMessage(null);
  };

  const handleStartRun = async () => {
    if (!hasSource || isSubmitting) return;

    const runSettings = settings ?? defaultSettings();

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let resolvedFileId = sourceFileId;

      if (pendingLocalFile) {
        const registered = await uploadFile.mutateAsync({
          file: pendingLocalFile,
          extractData: true,
        });
        resolvedFileId = registered.id;
        setSourceFileId(registered.id);
        setPendingLocalFile(null);
      }

      if (!resolvedFileId) {
        throw new Error("No source file selected");
      }

      const response = await startRun.mutateAsync({
        userInput: sourceFileName ?? "Generate cuts",
        metadata: {
          sourceFileId: resolvedFileId,
          settings: runSettings,
        },
      });

      setRunId(response.runId);
      invalidateCutsQueries();
      options?.onCompleted?.();

      setSourceOpen(false);
      setStatusPhase("success");
      setStatusOpen(true);
    } catch (error) {
      const message =
        error instanceof Error && error.message === "FILE_TOO_LARGE"
          ? tModal("fileTooLarge")
          : error instanceof Error
            ? error.message
            : tModal("uploadFailed");

      setSourceOpen(false);
      setStatusPhase("error");
      setErrorMessage(message);
      setStatusOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStatusOpen(false);
    setRunId(null);
    setErrorMessage(null);
    setSourceOpen(true);
  };

  const handleReset = () => {
    setSourceOpen(false);
    setStatusOpen(false);
    setRunId(null);
    setSourceFileId(null);
    setSourceFileName(null);
    setSourceFileSize(null);
    setPendingLocalFile(null);
    setErrorMessage(null);
  };

  return {
    sourceOpen,
    statusOpen,
    statusPhase,
    runId,
    localFile: pendingLocalFile,
    sourceFileName,
    sourceFileSize,
    hasSource,
    hasExistingSource,
    settings,
    errorMessage,
    isStarting: isSubmitting,
    handleOpen,
    handleCloseSource,
    handleCloseStatus,
    handleLocalFileChange,
    handleSelectExistingFile,
    handleStartRun,
    handleRetry,
    handleReset,
  };
};
