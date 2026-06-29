"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";

import {
  CAROUSEL_RUN_STEPS,
  getCarouselStepPhaseStatus,
  isCarouselStepAccessible,
  type CarouselRunPhaseSnapshot,
  type CarouselRunStepId,
} from "src/core/modules/agents/components/carousel/carousel-run-steps";
import { cn } from "src/core/shared/utils";

type CarouselRunStepperProps = {
  activeStep: CarouselRunStepId;
  phases: CarouselRunPhaseSnapshot;
  onStepChange: (stepId: CarouselRunStepId) => void;
};

export const CarouselRunStepper = ({
  activeStep,
  phases,
  onStepChange,
}: CarouselRunStepperProps) => (
  <nav
    aria-label="Etapas da execução"
    className="flex flex-wrap items-center gap-2"
    data-testid="carousel-run-stepper"
  >
    {CAROUSEL_RUN_STEPS.map((step, index) => {
      const status = getCarouselStepPhaseStatus(step.id, phases);
      const accessible = isCarouselStepAccessible(step.id, phases);
      const isActive = activeStep === step.id;
      const isCompleted = status === "completed";
      const isProcessing = status === "processing";
      const isError = status === "error";
      const isAwaitingAction = status === "awaiting_action";

      return (
        <div key={step.id} className="flex items-center gap-2">
          <button
            type="button"
            data-testid={`carousel-run-step-${step.id}`}
            disabled={!accessible}
            aria-current={isActive ? "step" : undefined}
            onClick={() => onStepChange(step.id)}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors",
              isActive &&
                isError &&
                "border-[var(--danger)] bg-[color-mix(in_oklch,var(--danger)_10%,transparent)] text-[var(--danger)]",
              isActive &&
                !isError &&
                "border-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]",
              !isActive &&
                accessible &&
                !isError &&
                "border-[var(--line-default)] bg-[var(--bg-base)] text-[var(--fg-secondary)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-subtle)]",
              !isActive &&
                accessible &&
                isError &&
                "border-[var(--danger-soft)] bg-[color-mix(in_oklch,var(--danger)_6%,transparent)] text-[var(--danger)] hover:border-[var(--danger)]",
              !accessible &&
                "cursor-not-allowed border-[var(--line-soft)] bg-[var(--bg-sunken)] text-[var(--fg-quaternary)] opacity-60",
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
                isCompleted && "bg-[var(--success-soft)] text-[var(--success)]",
                isProcessing && "bg-[var(--accent-soft)] text-[var(--accent)]",
                isError && "bg-[var(--danger-soft)] text-[var(--danger)]",
                isAwaitingAction &&
                  !isCompleted &&
                  !isProcessing &&
                  !isError &&
                  "bg-[var(--accent-soft)] text-[var(--accent)]",
                !isCompleted &&
                  !isProcessing &&
                  !isError &&
                  !isAwaitingAction &&
                  isActive &&
                  "bg-[var(--accent-soft)] text-[var(--accent)]",
                !isCompleted &&
                  !isProcessing &&
                  !isError &&
                  !isAwaitingAction &&
                  !isActive &&
                  accessible &&
                  "bg-[var(--bg-sunken)] text-[var(--fg-tertiary)]",
                !accessible && "bg-[var(--bg-sunken)] text-[var(--fg-quaternary)]",
              )}
            >
              {isCompleted ? (
                <Check className="size-3" aria-hidden />
              ) : isError ? (
                <AlertCircle className="size-3" aria-hidden />
              ) : isProcessing ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : (
                index + 1
              )}
            </span>
            {step.label}
          </button>
          {index < CAROUSEL_RUN_STEPS.length - 1 ? (
            <span
              className="hidden h-px w-4 bg-[var(--line-default)] sm:block"
              aria-hidden
            />
          ) : null}
        </div>
      );
    })}
  </nav>
);
