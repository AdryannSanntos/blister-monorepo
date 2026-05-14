import type * as React from "react";

import { cn } from "src/core/shared/utils";

type DsStageProps = {
  className?: string;
  children: React.ReactNode;
};

function DsStage({ className, children }: DsStageProps) {
  return (
    <div
      data-slot="ds-stage"
      className={cn("ds-grid-stage rounded-[var(--r-lg)] p-6", className)}
    >
      {children}
    </div>
  );
}

export { DsStage };
