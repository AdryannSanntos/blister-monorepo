"use client";

import {
  Check,
  ChevronDown,
  Clock,
  Loader2,
  type LucideIcon,
  X,
} from "lucide-react";
import { useState } from "react";
import { ExecutionTimeline } from "src/core/modules/agents/components/executions/execution-timeline";
import type { ChatMessageRunSummary } from "src/core/modules/agents/hooks/use-agent-chat";
import {
  type RunStep,
  useAgentRun,
} from "src/core/modules/agents/hooks/use-agent-runs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/core/shared/components/ui/collapsible";
import { cn } from "src/core/shared/utils";

type Props = {
  run: ChatMessageRunSummary;
  orgId: string;
};

function statusIcon(status: string): { Icon: LucideIcon; tone: string } {
  if (status === "queued")
    return { Icon: Clock, tone: "text-[var(--fg-tertiary)]" };
  if (status === "running")
    return { Icon: Loader2, tone: "text-[var(--accent)] animate-spin" };
  if (status === "completed" || status === "success")
    return { Icon: Check, tone: "text-[var(--success)]" };
  if (status === "error") return { Icon: X, tone: "text-[var(--danger)]" };
  return { Icon: Clock, tone: "text-[var(--fg-tertiary)]" };
}

function statusLabel(status: string) {
  if (status === "queued") return "Aguardando na fila";
  if (status === "running") return "Executando";
  if (status === "completed") return "Concluído";
  if (status === "success") return "Concluído";
  if (status === "awaiting_user_validation") return "Aguardando revisão";
  if (status === "error") return "Erro";
  if (status === "cancelled") return "Cancelado";
  return status;
}

function adaptSteps(steps: ChatMessageRunSummary["steps"]): RunStep[] {
  return steps.map((s) => ({
    id: s.id,
    blockKey: s.blockKey,
    blockType: s.blockType,
    status: (s.status === "success" ? "completed" : s.status) as RunStep["status"],
    inputPayload: s.inputPayload,
    outputPayload: s.outputPayload,
    errorMessage: s.errorMessage,
    retryCount: 0,
    startedAt: null,
    finishedAt: null,
    createdAt: s.createdAt,
  }));
}

function normalizeWorkflowSteps(steps: RunStep[]) {
  const latestByBlockKey = new Map<string, RunStep>();

  for (const step of steps) {
    if (step.blockType === "attempt") {
      continue;
    }

    latestByBlockKey.set(step.blockKey, step);
  }

  return Array.from(latestByBlockKey.values());
}

function ensureFailureStep(
  steps: RunStep[],
  runStatus: string,
  errorMessage?: string | null,
) {
  if (runStatus !== "error") {
    return steps;
  }

  const hasErrorStep = steps.some((step) => step.status === "error");
  if (hasErrorStep) {
    return steps;
  }

  return [
    ...steps,
    {
      id: "run-error",
      blockKey: "run-error",
      blockType: "run_error",
      status: "error" as const,
      inputPayload: {},
      outputPayload: {},
      errorMessage: errorMessage ?? "A execução falhou.",
      retryCount: 0,
      startedAt: null,
      finishedAt: null,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function ExecutionInlineCard({ run, orgId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { Icon, tone } = statusIcon(run.status);
  const normalizedSummarySteps = ensureFailureStep(
    normalizeWorkflowSteps(adaptSteps(run.steps)),
    run.status,
    run.errorMessage,
  );
  const totalSteps = normalizedSummarySteps.length;
  const completedSteps = normalizedSummarySteps.filter(
    (s) => s.status === "completed" || s.status === "success",
  ).length;
  const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  const isActive = run.status === "queued" || run.status === "running";

  const detailedRun = useAgentRun(orgId, expanded ? run.id : null);
  const detailedSteps = detailedRun.data?.steps;
  const resolvedStatus = detailedRun.data?.status ?? run.status;
  const resolvedErrorMessage =
    detailedRun.data?.errorMessage ?? run.errorMessage ?? null;
  const stepsToRender: RunStep[] = ensureFailureStep(
    normalizeWorkflowSteps(
      detailedSteps && detailedSteps.length > 0
        ? detailedSteps
        : adaptSteps(run.steps),
    ),
    resolvedStatus,
    resolvedErrorMessage,
  );
  const failurePreviewMessage =
    resolvedErrorMessage ??
    normalizedSummarySteps.find((step) => step.status === "error")
      ?.errorMessage ??
    null;

  return (
    <Collapsible
      open={expanded}
      onOpenChange={setExpanded}
      className="flex w-full flex-col overflow-hidden rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)]"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          aria-expanded={expanded}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors duration-[var(--dur-fast)] hover:bg-[var(--bg-hover)]"
        >
          <Icon className={cn("size-4 shrink-0", tone)} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
                {statusLabel(run.status)}
              </p>
              {run.status === "queued" &&
                typeof run.queuePosition === "number" && (
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
                    "h-full transition-all duration-[var(--dur-slow)] ease-out",
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
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-[var(--fg-quaternary)] transition-transform duration-[var(--dur-base)] ease-out",
              expanded && "rotate-180",
            )}
          />
        </button>
      </CollapsibleTrigger>

      {!expanded && run.status === "error" && (
        <div className="animate-in fade-in-0 slide-in-from-top-1 border-t border-[var(--line-subtle)] px-3 py-2 duration-[var(--dur-base)]">
          {normalizedSummarySteps.length > 0 ? (
            <ExecutionTimeline
              steps={normalizedSummarySteps}
              defaultExpanded={false}
            />
          ) : failurePreviewMessage ? (
            <p className="text-[11.5px] leading-[1.55] text-[var(--danger)]">
              {failurePreviewMessage}
            </p>
          ) : (
            <p className="text-[11.5px] leading-[1.55] text-[var(--danger)]">
              A execução falhou.
            </p>
          )}
        </div>
      )}

      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="border-t border-[var(--line-subtle)] p-3">
          {detailedRun.isLoading && !detailedSteps ? (
            <div className="flex h-12 items-center justify-center">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : stepsToRender.length === 0 ? (
            <p className="text-[11.5px] text-[var(--fg-tertiary)]">
              Sem etapas registradas ainda.
            </p>
          ) : (
            <ExecutionTimeline steps={stepsToRender} defaultExpanded={false} />
          )}
          {resolvedErrorMessage && (
            <div className="mt-3 animate-in fade-in-0 slide-in-from-bottom-1 rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--danger)_30%,transparent)] bg-[color-mix(in_oklch,var(--danger)_8%,transparent)] p-2.5 text-[11.5px] text-[var(--danger)] duration-[var(--dur-base)]">
              {resolvedErrorMessage}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
