"use client";

import { Check } from "lucide-react";

import { cn } from "src/core/shared/utils";

export type BlisterStep = {
  id: string;
  label: string;
};

type BlisterStepperProps = {
  steps: BlisterStep[];
  currentStepId: string;
  className?: string;
};

export const BlisterStepper = ({
  steps,
  currentStepId,
  className,
}: BlisterStepperProps) => {
  const currentIndex = steps.findIndex((step) => step.id === currentStepId);

  return (
    <ol
      className={cn("flex flex-wrap items-center gap-2", className)}
      aria-label="Progress"
    >
      {steps.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = step.id === currentStepId;

        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                isComplete &&
                  "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]",
                isCurrent &&
                  "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]",
                !isComplete &&
                  !isCurrent &&
                  "border-[var(--line-default)] text-[var(--fg-tertiary)]",
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isComplete ? <Check className="size-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                isCurrent
                  ? "font-medium text-[var(--fg-primary)]"
                  : "text-[var(--fg-tertiary)]",
              )}
            >
              {step.label}
            </span>
            {index < steps.length - 1 ? (
              <span
                className="mx-1 hidden h-px w-6 bg-[var(--line-default)] sm:block"
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};
