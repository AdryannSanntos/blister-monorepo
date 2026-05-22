"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Settings2 } from "lucide-react";
import { Button } from "src/core/shared/components/ui/button";
import { cn } from "src/core/shared/utils";
import { BLOCK_TYPES, type BlockTypeKey } from "./block-types";

export type FlowBlockNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  selected?: boolean;
  onConfigure?: () => void;
};

export function FlowBlockNode({ data, selected }: NodeProps) {
  const nodeData = data as FlowBlockNodeData;
  const type = BLOCK_TYPES[nodeData.blockType] ?? BLOCK_TYPES.llm_generate;
  const Icon = type.icon;
  const showSource = nodeData.blockType !== "output";
  const showTarget = nodeData.blockType !== "input";

  return (
    <div
      className={cn(
        "flex w-60 items-center gap-3 rounded-[var(--r-lg)] border bg-[var(--bg-base)] p-3 shadow-sm transition-colors",
        selected
          ? "border-[var(--accent)] ring-2 ring-[var(--accent)]/25"
          : "border-[var(--line-default)]",
      )}
    >
      {showTarget && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-2 !border-[var(--bg-base)] !bg-[var(--accent)]"
        />
      )}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-raised)]">
        <Icon className={cn("size-4", type.tone)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
          {nodeData.label ?? type.label}
        </p>
        <p className="truncate text-[11px] text-[var(--fg-tertiary)]">
          {type.description}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={(e) => {
          e.stopPropagation();
          nodeData.onConfigure?.();
        }}
        aria-label="Configurar bloco"
      >
        <Settings2 className="size-3.5" />
      </Button>
      {showSource && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-2 !border-[var(--bg-base)] !bg-[var(--accent)]"
        />
      )}
    </div>
  );
}
