"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { type ReactNode } from "react";
import { Button } from "src/core/shared/components/ui/button";

type FullFocusShellProps = {
  backHref: string;
  backLabel?: string;
  title: string;
  actions?: ReactNode;
  children: ReactNode;
};

export function FullFocusShell({
  backHref,
  backLabel = "Voltar",
  title,
  actions,
  children,
}: FullFocusShellProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-[var(--line-subtle)] px-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-[15px] font-medium text-[var(--fg-primary)]">
            {title}
          </h1>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
