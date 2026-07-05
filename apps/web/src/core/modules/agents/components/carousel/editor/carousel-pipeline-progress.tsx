"use client";

import { Loader2 } from "lucide-react";
import { Heading } from "src/core/shared/components/ui/heading";
import { cn } from "src/core/shared/utils";

export const CAROUSEL_PIPELINE_STEPS: { key: string; label: string }[] = [
  { key: "generate_content", label: "Gerando conteúdo" },
  { key: "generate_design_plan", label: "Montando layout" },
  { key: "generate_slides", label: "Finalizando slides" },
  { key: "render_slides", label: "Preparando imagens" },
];

export type CarouselPipelineSubStepStatus = "done" | "active" | "pending";

export type CarouselPipelineSubStepRow = {
  key: string;
  label: string;
  status: CarouselPipelineSubStepStatus;
};

export const mapCarouselPipelineSubSteps = (
  currentStepKey: string | null,
  options?: { completed?: boolean },
): CarouselPipelineSubStepRow[] => {
  if (options?.completed) {
    return CAROUSEL_PIPELINE_STEPS.map((step) => ({ ...step, status: "done" as const }));
  }

  const currentIndex = CAROUSEL_PIPELINE_STEPS.findIndex(
    (step) => step.key === currentStepKey,
  );

  return CAROUSEL_PIPELINE_STEPS.map((step, index) => ({
    ...step,
    status:
      currentIndex === -1
        ? "pending"
        : index < currentIndex
          ? "done"
          : index === currentIndex
            ? "active"
            : "pending",
  }));
};

const SubStepRow = ({ row }: { row: CarouselPipelineSubStepRow }) => (
  <div className="flex items-center gap-2.5" data-testid={`pipeline-substep-${row.key}`}>
    {row.status === "done" ? (
      <span className="flex size-4 items-center justify-center text-[var(--success)]">✓</span>
    ) : row.status === "active" ? (
      <Loader2 className="size-4 animate-spin text-[var(--accent)]" />
    ) : (
      <span className="size-1.5 rounded-full bg-[var(--fg-quaternary)]" />
    )}
    <span
      className={cn(
        "text-[13px]",
        row.status === "done" && "text-[var(--fg-tertiary)]",
        row.status === "active" && "font-medium text-[var(--fg-primary)]",
        row.status === "pending" && "text-[var(--fg-quaternary)]",
      )}
    >
      {row.label}
    </span>
  </div>
);

export const CarouselPipelineProgress = ({
  currentStepKey,
  completed = false,
}: {
  currentStepKey: string | null;
  completed?: boolean;
}) => {
  const rows = mapCarouselPipelineSubSteps(currentStepKey, { completed });

  return (
    <div
      className="flex w-full max-w-sm flex-col items-center gap-6 px-4 text-center"
      data-testid="carousel-pipeline-progress"
    >
      <Heading level="h4" as="h2">
        Processando seu carrossel…
      </Heading>
      <div className="flex flex-col items-start gap-3">
        {rows.map((row) => (
          <SubStepRow key={row.key} row={row} />
        ))}
      </div>
    </div>
  );
};
