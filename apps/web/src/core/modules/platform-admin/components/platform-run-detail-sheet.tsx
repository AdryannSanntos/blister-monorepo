"use client";

import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "src/core/shared/components/ui/sheet";
import {
  PlatformAdminStatusBadge,
  formatPlatformDate,
  formatPlatformMoney,
} from "./platform-admin-primitives";
import { usePlatformRun } from "../hooks/use-platform-runs";

function formatPayload(value: unknown) {
  if (value == null) return "-";

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

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
        className="w-full max-w-[640px] bg-[var(--bg-base)] p-0"
      >
        <SheetHeader className="border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            Detalhe da execucao
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            Observabilidade operacional da execucao selecionada.
          </SheetDescription>
        </SheetHeader>
        <div className="grid gap-4 p-6">
          <Card className="bg-[var(--bg-canvas)]">
            <CardHeader className="border-b border-[var(--line-subtle)] pb-4">
              <CardTitle className="text-[15px]">Resumo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 text-[13px] text-[var(--fg-secondary)]">
              <div className="flex items-center justify-between gap-3">
                <span>Status</span>
                <PlatformAdminStatusBadge status={run.data?.run.status} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Organization</span>
                <span>{run.data?.run.organizationId ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Agente</span>
                <span>{run.data?.run.agent.name ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Criado em</span>
                <span>{formatPlatformDate(run.data?.run.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>Atualizado em</span>
                <span>{formatPlatformDate(run.data?.run.updatedAt)}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-canvas)]">
            <CardHeader className="border-b border-[var(--line-subtle)] pb-4">
              <CardTitle className="text-[15px]">Custos e creditos</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4 text-[13px] text-[var(--fg-secondary)]">
              <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] px-4 py-3">
                <p className="text-[12px] text-[var(--fg-tertiary)]">
                  Custo total reportado
                </p>
                <p className="mt-1 text-[18px] font-medium text-[var(--fg-primary)]">
                  {formatPlatformMoney(
                    run.data?.costs.reduce((sum, item) => sum + item.amount, 0),
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {(run.data?.creditEntries ?? []).length > 0 ? (
                  run.data?.creditEntries.map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.entryType}: {item.amount}
                    </Badge>
                  ))
                ) : (
                  <p className="text-[12px] text-[var(--fg-tertiary)]">
                    Nenhum movimento de credito.
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                {(run.data?.costs ?? []).length > 0 ? (
                  run.data?.costs.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 py-2"
                    >
                      <span className="truncate">
                        {item.providerId ?? "provider desconhecido"}
                        {item.modelId ? ` / ${item.modelId}` : ""}
                      </span>
                      <span>
                        {formatPlatformMoney(item.amount, item.currency)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[12px] text-[var(--fg-tertiary)]">
                    Nenhum custo detalhado registrado.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-canvas)]">
            <CardHeader className="border-b border-[var(--line-subtle)] pb-4">
              <CardTitle className="text-[15px]">Steps</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 pt-4 text-[13px] text-[var(--fg-secondary)]">
              {(run.data?.run.steps ?? []).length > 0 ? (
                run.data?.run.steps.map((step) => (
                  <div
                    key={step.id}
                    className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[var(--fg-primary)]">
                        {step.blockType}
                      </p>
                      <PlatformAdminStatusBadge status={step.status} />
                    </div>
                    <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
                      {formatPlatformDate(step.createdAt)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-[12px] text-[var(--fg-tertiary)]">
                  Nenhum step registrado.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-[var(--bg-canvas)]">
            <CardHeader className="border-b border-[var(--line-subtle)] pb-4">
              <CardTitle className="text-[15px]">Payloads</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-4">
              <div>
                <p className="mb-2 text-[12px] font-medium text-[var(--fg-secondary)]">
                  Input
                </p>
                <pre className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-[11px] leading-[1.6] text-[var(--fg-tertiary)]">
                  {formatPayload(run.data?.run.inputPayload)}
                </pre>
              </div>
              <div>
                <p className="mb-2 text-[12px] font-medium text-[var(--fg-secondary)]">
                  Output
                </p>
                <pre className="overflow-x-auto rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3 text-[11px] leading-[1.6] text-[var(--fg-tertiary)]">
                  {formatPayload(run.data?.run.outputPayload)}
                </pre>
              </div>
              {run.data?.run.errorMessage ? (
                <div>
                  <p className="mb-2 text-[12px] font-medium text-[var(--danger)]">
                    Erro
                  </p>
                  <pre className="overflow-x-auto rounded-[var(--r-md)] border border-[color-mix(in_oklch,var(--danger)_25%,transparent)] bg-[color-mix(in_oklch,var(--danger)_6%,transparent)] p-3 text-[11px] leading-[1.6] text-[var(--danger)]">
                    {run.data.run.errorMessage}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  );
}
