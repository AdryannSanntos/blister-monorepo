"use client";

import { cn } from "src/core/shared/utils";

type ChipOption = {
  id: string;
  label: string;
};

type BlisterChipRowProps = {
  options: ChipOption[];
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  className?: string;
};

export const BlisterChipRow = ({
  options,
  value,
  onChange,
  ariaLabel,
  className,
}: BlisterChipRowProps) => (
  <div
    role="tablist"
    aria-label={ariaLabel}
    className={cn("flex flex-wrap gap-2", className)}
  >
    {options.map((option) => {
      const isActive = option.id === value;

      return (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          className={cn(
            "rounded-full border px-3 py-1.5 text-sm transition-colors",
            isActive
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-soft-text)]"
              : "border-[var(--line-default)] bg-[var(--bg-base)] text-[var(--fg-secondary)] hover:bg-[var(--bg-hover)]",
          )}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
