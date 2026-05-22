"use client";

import { Trash2, X } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { getBlockMeta, type BlockType } from "./block-types";

type NodeConfigPanelProps = {
  nodeId: string;
  blockType: BlockType;
  label: string;
  config: Record<string, unknown>;
  onUpdateLabel: (label: string) => void;
  onUpdateConfig: (config: Record<string, unknown>) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function NodeConfigPanel({
  nodeId,
  blockType,
  label,
  config,
  onUpdateLabel,
  onUpdateConfig,
  onDelete,
  onClose,
}: NodeConfigPanelProps) {
  const meta = getBlockMeta(blockType);
  const Icon = meta.icon;
  const isTerminal = blockType === "input" || blockType === "output";

  return (
    <div className="flex h-full flex-col border-l border-[var(--line-default)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--line-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex size-7 items-center justify-center rounded-[var(--r-md)]"
            style={{
              backgroundColor: `${meta.color}18`,
              color: meta.color,
            }}
          >
            <Icon className="size-3.5" />
          </div>
          <p className="text-[13px] font-medium text-[var(--fg-primary)]">
            {meta.label}
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
            Nome do bloco
          </label>
          <Input
            value={label}
            onChange={(e) => onUpdateLabel(e.target.value)}
            placeholder={meta.label}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
            ID
          </label>
          <p className="font-mono text-[12px] text-[var(--fg-quaternary)]">
            {nodeId}
          </p>
        </div>

        {blockType === "llm_generate" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Provider ID
              </label>
              <Input
                value={String(config.providerId ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, providerId: e.target.value })
                }
                placeholder="openrouter"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Model ID
              </label>
              <Input
                value={String(config.modelId ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, modelId: e.target.value })
                }
                placeholder="anthropic/claude-sonnet-4"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Prompt
              </label>
              <Textarea
                value={String(config.prompt ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, prompt: e.target.value })
                }
                rows={5}
                placeholder="Instruções para o modelo..."
              />
            </div>
          </>
        )}

        {blockType === "image_generate" && (
          <>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Provider ID
              </label>
              <Input
                value={String(config.providerId ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, providerId: e.target.value })
                }
                placeholder="openrouter"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Model ID
              </label>
              <Input
                value={String(config.modelId ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, modelId: e.target.value })
                }
                placeholder="dall-e-3"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Prompt
              </label>
              <Textarea
                value={String(config.prompt ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, prompt: e.target.value })
                }
                rows={4}
                placeholder="Descrição da imagem a gerar..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
                Tamanho
              </label>
              <Input
                value={String(config.size ?? "")}
                onChange={(e) =>
                  onUpdateConfig({ ...config, size: e.target.value })
                }
                placeholder="1024x1024"
              />
            </div>
          </>
        )}

        {blockType === "condition" && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              Condição
            </label>
            <Textarea
              value={String(config.condition ?? "")}
              onChange={(e) =>
                onUpdateConfig({ ...config, condition: e.target.value })
              }
              rows={3}
              placeholder="output.includes('approved')"
            />
          </div>
        )}

        {blockType === "brain_context" && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              Query de contexto
            </label>
            <Textarea
              value={String(config.query ?? "")}
              onChange={(e) =>
                onUpdateConfig({ ...config, query: e.target.value })
              }
              rows={3}
              placeholder="Buscar informações sobre..."
            />
          </div>
        )}

        {blockType === "transform" && (
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--fg-tertiary)]">
              Template de transformação
            </label>
            <Textarea
              value={String(config.template ?? "")}
              onChange={(e) =>
                onUpdateConfig({ ...config, template: e.target.value })
              }
              rows={4}
              placeholder="{{input.text | uppercase}}"
            />
          </div>
        )}

        {(blockType === "input" || blockType === "output") && (
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            Bloco terminal — não requer configuração adicional.
          </p>
        )}
      </div>

      {!isTerminal && (
        <div className="border-t border-[var(--line-subtle)] p-4">
          <Button
            variant="outline"
            className="w-full text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]"
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Remover bloco
          </Button>
        </div>
      )}
    </div>
  );
}
