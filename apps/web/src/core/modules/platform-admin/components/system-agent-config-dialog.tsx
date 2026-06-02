"use client";

import { useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/core/shared/components/ui/dialog";
import { Input } from "src/core/shared/components/ui/input";
import { Label } from "src/core/shared/components/ui/label";
import { Switch } from "src/core/shared/components/ui/switch";
import { useAIModels, useAIProviders } from "../hooks/use-ai-catalog";
import {
  type SystemAgentAdminView,
  useUpdateSystemAgentConfig,
} from "../hooks/use-system-agents";

const selectClass =
  "flex h-10 w-full rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 text-[14px]";

const toNumberOrNull = (value: string): number | null => {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export function SystemAgentConfigDialog({
  open,
  onOpenChange,
  agent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: SystemAgentAdminView | null;
}) {
  const providers = useAIProviders();
  const models = useAIModels();
  const updateConfig = useUpdateSystemAgentConfig();

  const [providerId, setProviderId] = useState("");
  const [modelId, setModelId] = useState("");
  const [temperature, setTemperature] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);

  // Hidrata o formulário sempre que abrir para um agente diferente.
  if (agent && open && hydratedKey !== agent.key) {
    setProviderId(agent.config.providerId ?? "");
    setModelId(agent.config.modelId ?? "");
    setTemperature(
      agent.config.temperature != null ? String(agent.config.temperature) : "",
    );
    setMaxOutputTokens(
      agent.config.maxOutputTokens != null
        ? String(agent.config.maxOutputTokens)
        : "",
    );
    setEnabled(agent.config.enabled);
    setHydratedKey(agent.key);
  }

  const availableModels = (models.data ?? []).filter(
    (model) => !providerId || model.providerId === providerId,
  );

  async function handleSave() {
    if (!agent) return;
    await updateConfig.mutateAsync({
      key: agent.key,
      providerId: providerId || null,
      modelId: modelId || null,
      temperature: toNumberOrNull(temperature),
      maxOutputTokens: toNumberOrNull(maxOutputTokens),
      enabled,
    });
    setHydratedKey(null);
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setHydratedKey(null);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Configurar IA do agente</DialogTitle>
          <DialogDescription>
            Defina o provider e o modelo que {agent?.name ?? "este agente"} usa.
            Deixe em branco para herdar o padrão da definição.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <select
              className={selectClass}
              value={providerId}
              onChange={(event) => {
                setProviderId(event.target.value);
                setModelId("");
              }}
            >
              <option value="">Padrão (auto)</option>
              {(providers.data ?? []).map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label>Modelo</Label>
            <select
              className={selectClass}
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
            >
              <option value="">Padrão (auto)</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Temperature</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="2"
                placeholder="Padrão"
                value={temperature}
                onChange={(event) => setTemperature(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Max output tokens</Label>
              <Input
                type="number"
                min="1"
                placeholder="Padrão"
                value={maxOutputTokens}
                onChange={(event) => setMaxOutputTokens(event.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-base)] px-3 py-2.5">
            <div>
              <p className="text-[13px] font-medium text-[var(--fg-primary)]">
                Agente habilitado
              </p>
              <p className="text-[12px] text-[var(--fg-tertiary)]">
                Quando desabilitado, o sistema não executa este agente.
              </p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={updateConfig.isPending}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
