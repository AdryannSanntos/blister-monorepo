"use client";

import { useCallback, useState } from "react";

const SUBMIT_DELAY_MS = 1200;

export type CarouselModalStatus = "idle" | "submitting";

export const useCarouselRunModal = () => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CarouselModalStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalVariant, setStatusModalVariant] = useState<"success" | "error">("success");
  const [statusRunId, setStatusRunId] = useState<string | null>(null);
  const [statusErrorMessage, setStatusErrorMessage] = useState<string | null>(null);

  const handleOpen = useCallback(() => {
    setErrorMessage(null);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (status === "submitting") return;
    setOpen(false);
  }, [status]);

  const handleSubmit = useCallback(() => {
    setStatus("submitting");
    setErrorMessage(null);

    setTimeout(() => {
      setStatus("idle");
      setOpen(false);
      // Plano 2: simula run criado com ID fixo
      setStatusRunId("run_carousel_preview");
      setStatusModalVariant("success");
      setStatusModalOpen(true);
    }, SUBMIT_DELAY_MS);
  }, []);

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
