"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import { getBlockMeta, type BlockType } from "./block-types";

export type FlowBlockData = {
  blockType: BlockType;
  label: string;
  config: Record<string, unknown>;
};

function FlowBlockNodeRaw({ data, selected }: NodeProps) {
  const blockData = data as unknown as FlowBlockData;
  const meta = getBlockMeta(blockData.blockType);
  const Icon = meta.icon;
  const isInput = blockData.blockType === "input";
  const isOutput = blockData.blockType === "output";

  return (
    <div
      className="group relative min-w-[200px] rounded-[var(--r-lg)] border bg-[var(--bg-raised)] shadow-sm transition-shadow duration-150"
      style={{
        borderColor: selected ? meta.color : "var(--line-default)",
        boxShadow: selected ? `0 0 0 2px ${meta.color}40` : undefined,
      }}
    >
      {!isInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!size-3 !rounded-full !border-2 !bg-[var(--bg-base)]"
          style={{ borderColor: meta.color }}
        />
      )}

      <div className="flex items-center gap-3 p-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)]"
          style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
        >
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-[var(--fg-primary)]">
            {blockData.label || meta.label}
          </p>
          <p className="truncate text-[11px] text-[var(--fg-tertiary)]">
            {meta.description}
          </p>
        </div>
      </div>

      {blockData.blockType === "llm_generate" &&
        blockData.config.prompt && (
          <div className="border-t border-[var(--line-subtle)] px-3 py-2">
            <p className="line-clamp-2 text-[11px] text-[var(--fg-tertiary)]">
              {String(blockData.config.prompt)}
            </p>
          </div>
        )}

      {!isOutput && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!size-3 !rounded-full !border-2 !bg-[var(--bg-base)]"
          style={{ borderColor: meta.color }}
        />
      )}
    </div>
  );
}

export const FlowBlockNode = memo(FlowBlockNodeRaw);
