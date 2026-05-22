"use client";

import type { Node } from "@xyflow/react";
import { X } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import { Input } from "src/core/shared/components/ui/input";
import { Label } from "src/core/shared/components/ui/label";
import { Textarea } from "src/core/shared/components/ui/textarea";
import { BLOCK_TYPES, type BlockTypeKey } from "./block-types";

type Props = {
  node: Node | null;
  onClose: () => void;
  onChange: (nodeId: string, patch: Partial<Node["data"]>) => void;
  onDelete: (nodeId: string) => void;
};

export function NodeConfigPanel({ node, onClose, onChange, onDelete }: Props) {
  if (!node) return null;
  const data = node.data as {
    blockType: BlockTypeKey;
    label?: string;
    prompt?: string;
  };
  const type = BLOCK_TYPES[data.blockType];
  const Icon = type.icon;

  const canConfigurePrompt =
    data.blockType === "llm_generate" || data.blockType === "image_generate";

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-[var(--line-subtle)] bg-[var(--bg-base)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--line-subtle)] px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className={`size-4 ${type.tone}`} />
          <p className="truncate text-[13px] font-medium text-[var(--fg-primary)]">
            {type.label}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="node-label"
            className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-quaternary)]"
          >
            Rótulo
          </Label>
          <Input
            id="node-label"
            value={data.label ?? ""}
            onChange={(e) => onChange(node.id, { label: e.target.value })}
            placeholder={type.label}
          />
        </div>

        {canConfigurePrompt && (
          <div className="space-y-1.5">
            <Label
              htmlFor="node-prompt"
              className="text-[11px] uppercase tracking-[0.08em] text-[var(--fg-quaternary)]"
            >
              Prompt
            </Label>
            <Textarea
              id="node-prompt"
              value={data.prompt ?? ""}
              onChange={(e) => onChange(node.id, { prompt: e.target.value })}
              placeholder="Descreva o que este bloco deve fazer..."
              className="min-h-[140px]"
            />
            <p className="text-[11px] text-[var(--fg-tertiary)]">
              Use variáveis em {`{{chaves}}`} para referenciar saídas de outros
              blocos.
            </p>
          </div>
        )}

        <div className="rounded-[var(--r-md)] border border-[var(--line-subtle)] bg-[var(--bg-sunken)] p-3">
          <p className="text-[12px] text-[var(--fg-tertiary)]">
            {type.description}
          </p>
        </div>
      </div>

      {data.blockType !== "input" && data.blockType !== "output" && (
        <div className="border-t border-[var(--line-subtle)] p-3">
          <Button
            variant="ghost"
            className="w-full justify-center text-[var(--danger)] hover:bg-[color-mix(in_oklch,var(--danger)_10%,transparent)]"
            onClick={() => onDelete(node.id)}
          >
            Remover bloco
          </Button>
        </div>
      )}
    </aside>
  );
}
