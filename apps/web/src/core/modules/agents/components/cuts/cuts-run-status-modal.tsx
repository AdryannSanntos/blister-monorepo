"use client";

import { useTranslations } from "next-intl";

import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { StatusModal } from "src/core/shared/components/ui/status-modal";

import { useRouter } from "@/i18n/routing";

const CUTS_ROUTE_SLUG = "cuts";

type CutsRunStatusModalProps = {
  open: boolean;
  variant: "success" | "error";
  runId: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry?: () => void;
};

export const CutsRunStatusModal = ({
  open,
  variant,
  runId,
  errorMessage,
  onClose,
  onRetry,
}: CutsRunStatusModalProps) => {
  const t = useTranslations("cuts.statusModal");
  const router = useRouter();
  const isSuccess = variant === "success";

  const handleViewExecution = () => {
    if (!runId) return;
    onClose();
    router.push(getAgentRunPath(CUTS_ROUTE_SLUG, runId));
  };

  return (
    <StatusModal
      open={open}
      variant={variant}
      title={isSuccess ? t("titleSuccess") : t("titleError")}
      description={
        isSuccess ? t("successDescription") : (errorMessage ?? t("errorGeneric"))
      }
      onClose={onClose}
      testId="cuts-status-modal"
      secondaryAction={{
        label: t("close"),
        onClick: onClose,
      }}
      primaryAction={
        isSuccess
          ? {
              label: t("viewExecution"),
              onClick: handleViewExecution,
              disabled: !runId,
              testId: "cuts-status-view-execution",
            }
          : onRetry
            ? {
                label: t("retry"),
                onClick: onRetry,
                testId: "cuts-status-retry",
              }
            : undefined
      }
    />
  );
};
