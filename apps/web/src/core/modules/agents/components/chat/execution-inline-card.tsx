"use client";

import { Check, Clock, Loader2, type LucideIcon, X } from "lucide-react";
import type { ChatMessageRunSummary } from "src/core/modules/agents/hooks/use-agent-chat";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";

type Props = {
  run: ChatMessageRunSummary;
  onClick?: () => void;
};

function statusIcon(status: string): { Icon: LucideIcon; tone: string } {
  if (status === "queued")
    return { Icon: Clock, tone: "text-[var(--fg-tertiary)]" };
  if (status === "running")
    return { Icon: Loader2, tone: "text-[var(--accent)] animate-spin" };
  if (status === "completed")
    return { Icon: Check, tone: "text-[var(--success)]" };
  if (status === "error") return { Icon: X, tone: "text-[var(--danger)]" };
  return { Icon: Clock, tone: "text-[var(--fg-tertiary)]" };
}

function statusLabel(status: string) {
  if (status === "queued") return "Aguardando na fila";
  if (status === "running") return "Executando";
  if (status === "completed") return "Concluído";
  if (status === "error") return "Erro";
  if (status === "cancelled") return "Cancelado";
  return status;
}

export function ExecutionInlineCard({ run, onClick }: Props) {
  const { Icon, tone } = statusIcon(run.status);
  const totalSteps = run.steps.length;
  const completedSteps = run.steps.filter(
    (s) => s.status === "completed",
  ).length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isActive = run.status === "queued" || run.status === "running";

  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="h-auto w-full justify-start gap-3 rounded-[var(--r-md)] border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-left hover:bg-[var(--bg-hover)]"
    >
      <Icon className={cn("size-4 shrink-0", tone)} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
            {statusLabel(run.status)}
          </p>
          {run.status === "queued" && typeof run.queuePosition === "number" && (
            <span className="shrink-0 text-[11px] text-[var(--fg-tertiary)]">
              Posição #{run.queuePosition}
            </span>
          )}
          {totalSteps > 0 && (
            <span className="shrink-0 text-[11px] text-[var(--fg-tertiary)] tabular-nums">
              {completedSteps} de {totalSteps} etapas
            </span>
          )}
        </div>
        {totalSteps > 0 && (
          <div className="h-1 w-full overflow-hidden rounded-[var(--r-full)] bg-[var(--bg-sunken)]">
            <div
              className={cn(
                "h-full transition-all duration-300",
                run.status === "error"
                  ? "bg-[var(--danger)]"
                  : "bg-[var(--accent)]",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
      {isActive && (
        <span className="ds-ai-pulse size-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
      )}
    </Button>
  );
}
