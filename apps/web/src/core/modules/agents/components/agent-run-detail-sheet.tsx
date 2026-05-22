"use client";

import { RotateCw } from "lucide-react";
import { PermissionGate } from "src/core/shared/components/permission-gate";
import { Button } from "src/core/shared/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";
import { useAgentRun, useRunAgent } from "../hooks/use-agent-runs";
import { AgentOutputPreview } from "./agent-output-preview";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number, currency = "USD") {
  return `${value.toFixed(4)} ${currency}`;
}

function getDurationLabel(startedAt: string, endedAt: string) {
  const durationMs = Math.max(
    0,
    new Date(endedAt).getTime() - new Date(startedAt).getTime(),
  );
  const seconds = Math.round(durationMs / 1000);
  return `${seconds}s`;
}

export function AgentRunDetailSheet({
  orgId,
  runId,
  onClose,
}: {
  orgId: string;
  runId: string | null;
  onClose: () => void;
}) {
  const run = useAgentRun(orgId, runId, { pollActive: true });
  const replayRun = useRunAgent(orgId, run.data?.run.agentId ?? null);

  const currentRun = run.data?.run;
  const totalCredits =
    run.data?.creditEntries.reduce(
      (sum, entry) => sum + Math.abs(Math.min(entry.amount, 0)),
      0,
    ) ?? 0;
  const totalTechnicalCost =
    run.data?.technicalCosts.reduce((sum, entry) => sum + entry.amount, 0) ?? 0;

  async function handleReplay() {
    if (!currentRun) return;
    const input =
      typeof currentRun.inputPayload === "object" &&
      currentRun.inputPayload !== null
        ? (currentRun.inputPayload as Record<string, unknown>)
        : {};

    await replayRun.mutateAsync({ input });
    onClose();
  }

  return (
    <Sheet open={Boolean(runId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full max-w-[620px] bg-[var(--bg-base)] p-0"
      >
        <SheetHeader className="gap-2 border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            Detalhe do run
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            Acompanhe a execução, os blocos processados e o consumo operacional
            sem expor metadados internos da IA.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          {!currentRun ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              <section className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                    Resumo
                  </p>
                  <div className="mt-3 space-y-2 text-[13px] text-[var(--fg-secondary)]">
                    <p>Agente: {currentRun.agent.name}</p>
                    <p>Status: {currentRun.status}</p>
                    <p>
                      Versão: v{currentRun.agentVersion?.versionNumber ?? "-"}
                    </p>
                    <p>Iniciado em: {formatDate(currentRun.createdAt)}</p>
                    <p>
                      Duração:{" "}
                      {getDurationLabel(
                        currentRun.createdAt,
                        currentRun.updatedAt,
                      )}
                    </p>
                  </div>
                </div>
                <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-raised)] p-4">
                  <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                    Consumo
                  </p>
                  <div className="mt-3 space-y-2 text-[13px] text-[var(--fg-secondary)]">
                    <p>Créditos cobrados: {totalCredits}</p>
                    <p>Custo técnico: {formatCurrency(totalTechnicalCost)}</p>
                    <p>
                      Providers/modelos:{" "}
                      {run.data?.technicalCosts.length
                        ? run.data.technicalCosts
                            .map(
                              (entry) =>
                                `${entry.providerId ?? "provider"}/${entry.modelId ?? "model"}`,
                            )
                            .join(", ")
                        : "Não registrado"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-2 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Input
                </p>
                <AgentOutputPreview output={currentRun.inputPayload} />
              </section>

              <section className="space-y-2 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Output
                </p>
                <AgentOutputPreview output={currentRun.outputPayload} />
              </section>

              <section className="space-y-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Timeline de blocos
                </p>
                <div className="space-y-2">
                  {(currentRun.steps ?? []).map((step) => (
                    <div
                      key={step.id}
                      className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                            {step.blockType}
                          </p>
                          <p className="text-[12px] text-[var(--fg-tertiary)]">
                            {step.blockKey}
                          </p>
                        </div>
                        <p className="font-mono text-[12px] tabular-nums text-[var(--fg-secondary)]">
                          {step.status}
                        </p>
                      </div>
                      {step.errorMessage ? (
                        <p className="mt-2 text-[12px] text-[var(--danger)]">
                          {step.errorMessage}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-3 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
                <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
                  Lançamentos financeiros
                </p>
                <div className="space-y-2 text-[13px] text-[var(--fg-secondary)]">
                  {(run.data?.creditEntries ?? []).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>{entry.entryType}</span>
                      <span className="font-mono tabular-nums">
                        {entry.amount}
                      </span>
                    </div>
                  ))}
                  {(run.data?.technicalCosts ?? []).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span>{`${entry.providerId ?? "provider"} / ${entry.modelId ?? "model"}`}</span>
                      <span className="font-mono tabular-nums">
                        {formatCurrency(entry.amount, entry.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <PermissionGate permission="agent.execute">
                <div className="flex justify-end">
                  <Button
                    onClick={() => void handleReplay()}
                    disabled={replayRun.isPending}
                  >
                    <RotateCw className="size-4" />
                    Executar novamente
                  </Button>
                </div>
              </PermissionGate>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
