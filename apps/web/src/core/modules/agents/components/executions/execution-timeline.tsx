"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  type LucideIcon,
  X,
} from "lucide-react";
import { useState } from "react";
import { getStepIcon } from "src/core/modules/agents/components/flow-builder/block-types";
import type { RunStep } from "src/core/modules/agents/hooks/use-agent-runs";
import { Badge } from "src/core/shared/components/ui/badge";
import { cn } from "src/core/shared/utils";

type Props = {
  steps: RunStep[];
  defaultExpanded?: boolean;
};

function statusIcon(status: string): { Icon: LucideIcon; tone: string } {
  if (status === "running")
    return { Icon: Loader2, tone: "text-[var(--accent)] animate-spin" };
  if (status === "completed")
    return { Icon: Check, tone: "text-[var(--success)]" };
  if (status === "error") return { Icon: X, tone: "text-[var(--danger)]" };
  return { Icon: Loader2, tone: "text-[var(--fg-tertiary)]" };
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  try {
    const ms = new Date(end).getTime() - new Date(start).getTime();
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  } catch {
    return "—";
  }
}

function blockTypeLabel(blockType: string) {
  if (blockType === "intent_classification") return "Classificação de intenção";
  if (blockType === "context_retrieval") return "Coleta de contexto";
  if (blockType === "llm_call") return "Chamada de LLM";
  if (blockType === "html_validation") return "Validação de HTML";
  if (blockType === "output_storage") return "Armazenamento";
  if (blockType === "attempt") return "Tentativa";
  return blockType;
}

function StepItem({
  step,
  defaultExpanded,
}: {
  step: RunStep;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(Boolean(defaultExpanded));
  const { Icon: StatusIcon, tone } = statusIcon(step.status);
  const TypeIcon = getStepIcon(step.blockType);

  return (
    <div className="animate-in slide-in-from-top-1 duration-200">
      <button
        type="button"
        className="flex w-full items-center gap-2.5 rounded-[var(--r-md)] px-2 py-2 text-left transition-colors hover:bg-[var(--bg-hover)]"
        onClick={() => setExpanded((p) => !p)}
      >
        <span className="flex size-7 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
          <TypeIcon className="size-3.5 text-[var(--fg-tertiary)]" />
        </span>
        <StatusIcon className={cn("size-3.5 shrink-0", tone)} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {blockTypeLabel(step.blockType)}
          </span>
          <span className="text-[11px] text-[var(--fg-tertiary)] tabular-nums">
            {formatDuration(step.startedAt, step.finishedAt)}
          </span>
        </span>
        {step.retryCount > 0 && (
          <Badge variant="warning" className="shrink-0">
            Tentativa {step.retryCount + 1}
          </Badge>
        )}
        {expanded ? (
          <ChevronDown className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
        ) : (
          <ChevronRight className="size-3.5 shrink-0 text-[var(--fg-quaternary)]" />
        )}
      </button>
      {expanded && (
        <div className="ml-9 mt-1 mb-2 space-y-2 rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-2.5 text-[11.5px]">
          {step.errorMessage && (
            <p className="text-[var(--danger)]">{step.errorMessage}</p>
          )}
          {step.createdAt && (
            <p className="text-[var(--fg-tertiary)] tabular-nums">
              {format(new Date(step.createdAt), "dd/MM/yyyy HH:mm:ss", {
                locale: ptBR,
              })}
            </p>
          )}
          {typeof step.outputPayload === "object" && step.outputPayload && (
            <pre className="max-h-40 overflow-auto rounded-[var(--r-sm)] bg-[var(--bg-base)] p-2 text-[10.5px] text-[var(--fg-secondary)]">
              {JSON.stringify(step.outputPayload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutionTimeline({ steps, defaultExpanded }: Props) {
  if (!steps || steps.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-[12px] text-[var(--fg-tertiary)]">
        Sem etapas para mostrar.
      </p>
    );
  }
  return (
    <div className="space-y-0.5">
      {steps.map((step) => (
        <StepItem key={step.id} step={step} defaultExpanded={defaultExpanded} />
      ))}
    </div>
  );
}
