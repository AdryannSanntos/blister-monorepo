"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";
import { usePlatformRun } from "../hooks/use-platform-runs";

export function PlatformRunDetailSheet({
  runId,
  onClose,
}: {
  runId: string | null;
  onClose: () => void;
}) {
  const run = usePlatformRun(runId);

  return (
    <Sheet open={Boolean(runId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-[560px] bg-[var(--bg-base)] p-0"
      >
        <SheetHeader className="border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            Run detail
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            Observabilidade operacional da execução selecionada.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 p-6 text-[13px] text-[var(--fg-secondary)]">
          <p>Status: {run.data?.run.status ?? "-"}</p>
          <p>Organization: {run.data?.run.organizationId ?? "-"}</p>
          <p>Agent: {run.data?.run.agent.name ?? "-"}</p>
          <p>
            Costs:{" "}
            {run.data?.costs
              .map((item) => `${item.providerId ?? "unknown"}: ${item.amount}`)
              .join(", ") || "-"}
          </p>
          <p>
            Credits:{" "}
            {run.data?.creditEntries
              .map((item) => `${item.entryType}: ${item.amount}`)
              .join(", ") || "-"}
          </p>
          <div>
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
              Steps
            </p>
            <ul className="space-y-2">
              {(run.data?.run.steps ?? []).map((step) => (
                <li
                  key={step.id}
                  className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-canvas)] px-3 py-2"
                >
                  {step.blockType} · {step.status}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
