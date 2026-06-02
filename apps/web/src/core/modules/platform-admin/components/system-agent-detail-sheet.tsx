"use client";

import { Play } from "lucide-react";
import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
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
import { Textarea } from "src/core/shared/components/ui/textarea";
import type { AIModel, AIProvider } from "../hooks/use-ai-catalog";
import {
  type SystemAgentAdminView,
  type SystemAgentRunResult,
  useTestSystemAgent,
} from "../hooks/use-system-agents";
import {
  formatPlatformDate,
  PlatformAdminStatusBadge,
} from "./platform-admin-primitives";

function formatPayload(value: unknown) {
  if (value == null) return "-";
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5">
      <span className="text-[12px] text-[var(--fg-tertiary)]">{label}</span>
      <span className="text-[13px] font-medium text-[var(--fg-primary)]">
        {value}
      </span>
    </div>
  );
}

export function SystemAgentDetailSheet({
  agent,
  providers,
  models,
  onClose,
}: {
  agent: SystemAgentAdminView | null;
  providers: AIProvider[];
  models: AIModel[];
  onClose: () => void;
}) {
  const testAgent = useTestSystemAgent();
  const [draft, setDraft] = useState("");
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [result, setResult] = useState<SystemAgentRunResult | null>(null);

  if (agent && hydratedKey !== agent.key) {
    setDraft(formatPayload(agent.sampleInput));
    setHydratedKey(agent.key);
    setResult(null);
  }

  const providerName = (id: string | null) =>
    id ? (providers.find((p) => p.id === id)?.name ?? id) : "Padrão (auto)";
  const modelName = (id: string | null) =>
    id ? (models.find((m) => m.id === id)?.name ?? id) : "Padrão (auto)";

  async function handleRun() {
    if (!agent) return;
    let parsedInput: unknown;
    try {
      parsedInput = draft.trim() ? JSON.parse(draft) : undefined;
    } catch {
      setResult({
        agentKey: agent.key,
        status: "failed",
        data: null,
        errorMessage: "JSON de entrada inválido.",
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      });
      return;
    }
    const run = await testAgent.mutateAsync({
      key: agent.key,
      input: parsedInput,
    });
    setResult(run);
  }

  return (
    <Sheet
      open={Boolean(agent)}
      onOpenChange={(open) => {
        if (!open) {
          setHydratedKey(null);
          onClose();
        }
      }}
    >
      <SheetContent
        side="right"
        className="w-full max-w-[640px] overflow-y-auto bg-[var(--bg-base)] p-0"
      >
        <SheetHeader className="border-b border-[var(--line-subtle)] p-6">
          <SheetTitle className="text-[18px] font-medium text-[var(--fg-primary)]">
            {agent?.name ?? "Agente de sistema"}
          </SheetTitle>
          <SheetDescription className="text-[13px] text-[var(--fg-tertiary)]">
            {agent?.description}
          </SheetDescription>
        </SheetHeader>

        {agent ? (
          <div className="grid gap-4 p-6">
            <Card className="bg-[var(--bg-canvas)]">
              <CardHeader className="border-b border-[var(--line-subtle)] pb-4">
                <CardTitle className="text-[15px]">
                  Configuração de IA
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <InfoRow label="Identificador" value={agent.key} />
                <InfoRow
                  label="Status"
                  value={agent.config.enabled ? "Habilitado" : "Desabilitado"}
                />
                <InfoRow
                  label="Provider"
                  value={providerName(agent.config.providerId)}
                />
                <InfoRow
                  label="Modelo"
                  value={modelName(agent.config.modelId)}
                />
                <InfoRow
                  label="Temperature"
                  value={
                    agent.config.temperature != null
                      ? String(agent.config.temperature)
                      : `Padrão (${agent.defaultModel?.temperature ?? "auto"})`
                  }
                />
                <InfoRow
                  label="Max output tokens"
                  value={
                    agent.config.maxOutputTokens != null
                      ? String(agent.config.maxOutputTokens)
                      : `Padrão (${agent.defaultModel?.maxOutputTokens ?? "auto"})`
                  }
                />
                <InfoRow
                  label="Atualizado em"
                  value={formatPlatformDate(agent.updatedAt)}
                />
              </CardContent>
            </Card>

            <Card className="bg-[var(--bg-canvas)]">
              <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 border-b border-[var(--line-subtle)] pb-4">
                <CardTitle className="text-[15px]">
                  Testar (playground)
                </CardTitle>
                <Button
                  size="sm"
                  onClick={handleRun}
                  disabled={testAgent.isPending}
                >
                  <Play className="size-3.5" />
                  {testAgent.isPending ? "Rodando..." : "Rodar teste"}
                </Button>
              </CardHeader>
              <CardContent className="grid gap-3 pt-4">
                <div className="space-y-1.5">
                  <p className="text-[12px] text-[var(--fg-tertiary)]">
                    Input (JSON)
                  </p>
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    rows={8}
                    className="font-mono text-[12px]"
                  />
                </div>

                {result ? (
                  <div className="space-y-2 rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] text-[var(--fg-tertiary)]">
                        Resultado
                      </span>
                      <PlatformAdminStatusBadge status={result.status} />
                    </div>
                    {result.errorMessage ? (
                      <p className="text-[12px] text-[var(--danger)]">
                        {result.errorMessage}
                      </p>
                    ) : null}
                    <pre className="overflow-x-auto whitespace-pre-wrap break-words text-[12px] text-[var(--fg-secondary)]">
                      {formatPayload(result.data)}
                    </pre>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
