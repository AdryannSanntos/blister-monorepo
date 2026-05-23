"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Share2 } from "lucide-react";
import { ExecutionTimeline } from "src/core/modules/agents/components/executions/execution-timeline";
import {
  type AgentRun,
  useAgentRun,
} from "src/core/modules/agents/hooks/use-agent-runs";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  runId: string | null;
};

function formatRunDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

function statusVariant(
  status: AgentRun["status"],
): "success" | "secondary" | "destructive" | "warning" {
  if (status === "completed") return "success";
  if (status === "error") return "destructive";
  if (status === "running" || status === "queued") return "warning";
  return "secondary";
}

function statusLabel(status: AgentRun["status"]) {
  if (status === "completed") return "Concluído";
  if (status === "error") return "Erro";
  if (status === "running") return "Executando";
  if (status === "queued") return "Aguardando";
  if (status === "cancelled") return "Cancelado";
  return status;
}

export function RunDetailSheet({ open, onOpenChange, orgId, runId }: Props) {
  const run = useAgentRun(orgId, runId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] max-w-[100vw] sm:max-w-[480px] overflow-y-auto p-0">
        <SheetHeader className="border-b border-[var(--line-subtle)] px-6 py-4">
          <SheetTitle className="text-[15px] font-medium text-[var(--fg-primary)]">
            Detalhes da execução
          </SheetTitle>
          <SheetDescription className="text-[12px] text-[var(--fg-tertiary)]">
            {run.data ? formatRunDate(run.data.createdAt) : "Carregando..."}
          </SheetDescription>
        </SheetHeader>

        {run.isLoading || !run.data ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex items-center justify-between gap-2">
              <Badge variant={statusVariant(run.data.status)}>
                {statusLabel(run.data.status)}
              </Badge>
              <div className="flex items-center gap-3 text-[12px] text-[var(--fg-tertiary)] tabular-nums">
                <span>{run.data.creditDelta ?? 0} créditos</span>
                <span className="text-[var(--fg-quaternary)]">·</span>
                <span>R$ {(run.data.technicalCost ?? 0).toFixed(4)}</span>
              </div>
            </div>

            {run.data.errorMessage && (
              <div className="rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--danger)_30%,transparent)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] p-3 text-[12.5px] text-[var(--danger)]">
                {run.data.errorMessage}
              </div>
            )}

            <section className="space-y-2">
              <h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--fg-quaternary)]">
                Etapas
              </h3>
              <ExecutionTimeline steps={run.data.steps ?? []} defaultExpanded />
            </section>

            <Button variant="outline" className="w-full" disabled>
              <Share2 className="size-3.5" />
              Compartilhar link (em breve)
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
