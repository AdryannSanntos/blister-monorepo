"use client";

import { getAgentRunPath } from "src/core/modules/agents/utils/agent-paths";
import { StatusModal } from "src/core/shared/components/ui/status-modal";
import { useRouter } from "@/i18n/routing";

const CAROUSEL_ROUTE_SLUG = "carousel";

type Props = {
  open: boolean;
  variant: "success" | "error";
  runId: string | null;
  errorMessage?: string | null;
  onClose: () => void;
  onRetry?: () => void;
};

export const CarouselRunStatusModal = ({
  open, variant, runId, errorMessage, onClose, onRetry,
}: Props) => {
  const router = useRouter();
  const isSuccess = variant === "success";

  const handleViewExecution = () => {
    if (!runId) return;
    onClose();
    router.push(getAgentRunPath(CAROUSEL_ROUTE_SLUG, runId));
  };

  return (
    <StatusModal
      open={open}
      variant={variant}
      title={isSuccess ? "Carrossel em processamento" : "Erro ao iniciar"}
      description={
        isSuccess
          ? "Seu carrossel está sendo gerado. Acompanhe o progresso na página de execução."
          : (errorMessage ?? "Ocorreu um erro inesperado. Tente novamente.")
      }
      onClose={onClose}
      testId="carousel-status-modal"
      secondaryAction={{ label: "Fechar", onClick: onClose }}
      primaryAction={
        isSuccess
          ? { label: "Ver execução", onClick: handleViewExecution, disabled: !runId, testId: "carousel-status-view-execution" }
          : onRetry
            ? { label: "Tentar novamente", onClick: onRetry, testId: "carousel-status-retry" }
            : undefined
      }
    />
  );
};
