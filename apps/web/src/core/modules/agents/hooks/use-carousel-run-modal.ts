"use client";

import type { CarouselRunInput } from "@company-os/types";
import { carouselAgentSettingsSchema } from "@company-os/types";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";

import { useStartAgentRun } from "./use-agent-run-mutations";
import { carouselRunsQueryKey } from "./use-carousel-runs";
import {
  carouselSettingsQueryKey,
  fetchCarouselSettings,
  useCarouselSettings,
} from "./use-carousel-settings";
import { carouselStatsQueryKey } from "./use-carousel-stats";

const CAROUSEL_AGENT_ID = "carousel";

const defaultSettings = () => carouselAgentSettingsSchema.parse({});

export type CarouselModalStatus = "idle" | "submitting";

export const useCarouselRunModal = () => {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CarouselModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalVariant, setStatusModalVariant] = useState<
    "success" | "error"
  >("success");
  const [statusRunId, setStatusRunId] = useState<string | null>(null);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(
    null,
  );

  const { data: settings } = useCarouselSettings();
  const startRun = useStartAgentRun(CAROUSEL_AGENT_ID);

  const invalidateCarouselQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: carouselRunsQueryKey() });
    queryClient.invalidateQueries({ queryKey: carouselStatsQueryKey });
    queryClient.invalidateQueries({ queryKey: ["agent-runs", CAROUSEL_AGENT_ID] });
  }, [queryClient]);

  const handleOpen = useCallback(async () => {
    setErrorMessage(null);
    await queryClient.ensureQueryData({
      queryKey: carouselSettingsQueryKey,
      queryFn: fetchCarouselSettings,
    });
    setOpen(true);
  }, [queryClient]);

  const handleClose = useCallback(() => {
    if (status === "submitting") return;
    setOpen(false);
  }, [status]);

  const handleSubmit = useCallback(
    async (data: CarouselRunInput) => {
      if (status === "submitting") return;

      setStatus("submitting");
      setErrorMessage(null);

      const runSettings = settings ?? defaultSettings();

      try {
        const response = await startRun.mutateAsync({
          userInput: data.theme,
          metadata: {
            theme: data.theme,
            templateId: data.templateId,
            socialNetworks: data.socialNetworks,
            slidesCount: data.slidesCount,
            brandOverrides: data.brandOverrides,
            settings: {
              ...runSettings,
              slidesCount: data.slidesCount,
            },
          },
        });

        invalidateCarouselQueries();
        setOpen(false);
        setStatusModalVariant("success");
        setStatusErrorMessage(null);
        setStatusRunId(response.runId);
        setStatusModalOpen(true);
      } catch (error) {
        setOpen(false);
        setStatusModalVariant("error");
        setStatusRunId(null);
        setStatusErrorMessage(
          error instanceof Error ? error.message : "Erro ao iniciar carrossel",
        );
        setStatusModalOpen(true);
      } finally {
        setStatus("idle");
      }
    },
    [status, settings, startRun, invalidateCarouselQueries],
  );

  const handleCloseStatusModal = useCallback(() => {
    setStatusModalOpen(false);
  }, []);

  const handleRetryFromStatusModal = useCallback(() => {
    setStatusModalOpen(false);
    setOpen(true);
  }, []);

  return {
    open,
    status,
    isSubmitting: status === "submitting",
    errorMessage,
    statusModalOpen,
    statusModalVariant,
    statusRunId,
    statusErrorMessage,
    handleOpen,
    handleClose,
    handleSubmit,
    handleCloseStatusModal,
    handleRetryFromStatusModal,
  };
};
