import type * as React from "react";

import { cn } from "src/core/shared/utils";

type DsFieldProps = {
  label: string;
  helper?: string;
  className?: string;
  children: React.ReactNode;
};

function DsField({ label, helper, className, children }: DsFieldProps) {
  return (
    <label
      data-slot="ds-field"
      className={cn("flex flex-col gap-1.5", className)}
    >
      <span className="text-[12px] font-medium text-[var(--fg-secondary)]">
        {label}
      </span>
      {children}
      {helper ? (
        <span className="text-[11.5px] text-[var(--fg-tertiary)]">
          {helper}
        </span>
      ) : null}
    </label>
  );
}

export { DsField };
