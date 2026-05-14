import type * as React from "react";

import { cn } from "src/core/shared/utils";

type DsSectionProps = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  children: React.ReactNode;
};

function DsSection({
  id,
  eyebrow,
  title,
  description,
  className,
  children,
}: DsSectionProps) {
  return (
    <section
      id={id}
      data-slot="ds-section"
      className={cn(
        "scroll-mt-16 border-t border-[var(--line-subtle)] pt-10 first:border-t-0 first:pt-0",
        className,
      )}
    >
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-[var(--fg-quaternary)] uppercase">
          {eyebrow}
        </p>
        <h2 className="text-3xl font-medium tracking-[-0.03em]">{title}</h2>
        <p className="max-w-3xl text-[14px] leading-7 text-[var(--fg-secondary)]">
          {description}
        </p>
      </div>
      {children}
    </section>
  );
}

export { DsSection };
