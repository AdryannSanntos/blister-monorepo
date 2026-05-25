"use client";

import { Handle, type NodeProps, Position } from "@xyflow/react";
import { Settings2, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "src/core/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "src/core/shared/components/ui/dropdown-menu";
import { cn } from "src/core/shared/utils";
import {
  BLOCK_TYPES,
  type BlockPort,
  type BlockTypeKey,
} from "./block-types";

export type FlowBlockNodeData = {
  blockType: BlockTypeKey;
  label?: string;
  selected?: boolean;
  onConfigure?: () => void;
  onDelete?: () => void;
  menuOpen?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
};

const HANDLE_CLASS =
  "!border-2 !border-[var(--bg-raised)] !bg-[var(--accent)] transition-transform duration-150 hover:scale-125";

function computeHandleOffset(index: number, total: number): string {
  if (total === 1) return "50%";
  const step = 100 / (total + 1);
  return `${step * (index + 1)}%`;
}

function SourceHandles({ ports }: { ports: BlockPort[] }) {
  return (
    <>
      {ports.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{ top: computeHandleOffset(i, ports.length) }}
          className={cn("!size-2.5", HANDLE_CLASS)}
          title={port.label}
        />
      ))}
    </>
  );
}

function TargetHandles({ ports }: { ports: BlockPort[] }) {
  return (
    <>
      {ports.map((port, i) => (
        <Handle
          key={port.id}
          id={port.id}
          type="target"
          position={Position.Left}
          style={{ top: computeHandleOffset(i, ports.length) }}
          className={cn("!size-2.5", HANDLE_CLASS)}
          title={port.label}
        />
      ))}
    </>
  );
}

export function FlowBlockNode({ data, selected, dragging }: NodeProps) {
  const nodeData = data as FlowBlockNodeData;
  const blockKey = nodeData.blockType ?? "llm_call";
  const type = BLOCK_TYPES[blockKey as BlockTypeKey] ?? BLOCK_TYPES.llm_call;
  const Icon = type.icon;
  const isInput = blockKey === "input";
  const isOutput = blockKey === "output" || blockKey === "finalizer";
  const isTerminal = isInput || isOutput;

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (isTerminal) {
    return (
      <div
        className={cn(
          "group relative flex h-20 w-20 items-center justify-center rounded-full border-2 bg-[var(--bg-raised)] text-center shadow-[var(--shadow-md)]",
          "transition-all duration-200 ease-out",
          !mounted && "opacity-0 scale-90",
          mounted && "opacity-100 scale-100",
          selected
            ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/45 shadow-[0_8px_28px_color-mix(in_oklch,var(--accent)_35%,transparent)]"
            : "border-[var(--line-strong)] hover:border-[var(--accent)]/70",
          dragging && "scale-[1.04] border-[var(--accent)]/80",
        )}
      >
        {type.targetPorts.length > 0 && (
          <TargetHandles ports={type.targetPorts} />
        )}
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-full bg-[var(--bg-sunken)]",
              isInput &&
                "bg-[color-mix(in_oklch,var(--info)_18%,var(--bg-sunken))]",
              isOutput &&
                "bg-[color-mix(in_oklch,var(--success)_18%,var(--bg-sunken))]",
            )}
          >
            <Icon className={cn("size-4", type.tone)} />
          </div>
          <p className="px-1 text-[10px] font-medium leading-tight text-[var(--fg-secondary)]">
            {nodeData.label ?? type.label}
          </p>
        </div>
        {type.sourcePorts.length > 0 && (
          <SourceHandles ports={type.sourcePorts} />
        )}
      </div>
    );
  }

  const hasMultipleSourcePorts = type.sourcePorts.length > 1;
  const extraHeight = hasMultipleSourcePorts
    ? `${Math.max(0, (type.sourcePorts.length - 1) * 20)}px`
    : undefined;

  return (
    <div
      style={extraHeight ? { minHeight: `calc(56px + ${extraHeight})` } : undefined}
      className={cn(
        "group relative flex w-56 items-center gap-3 rounded-[var(--r-lg)] border bg-[var(--bg-raised)] p-3 shadow-[var(--shadow-sm)]",
        "transition-all duration-200 ease-out",
        !mounted && "opacity-0 scale-95 translate-y-1",
        mounted && "opacity-100 scale-100 translate-y-0",
        selected
          ? "border-[var(--accent)] ring-4 ring-[var(--accent)]/40 shadow-[0_8px_24px_color-mix(in_oklch,var(--accent)_28%,transparent)]"
          : "border-[var(--line-strong)] hover:border-[var(--accent)]/60 hover:shadow-md",
        dragging &&
          "shadow-[var(--shadow-lg)] scale-[1.03] border-[var(--accent)]/70 ring-2 ring-[var(--accent)]/20",
      )}
    >
      {type.targetPorts.length > 0 && (
        <TargetHandles ports={type.targetPorts} />
      )}
      <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] transition-colors duration-150">
        <Icon className={cn("size-4", type.tone)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[12.5px] font-medium text-[var(--fg-primary)]">
          {nodeData.label ?? type.label}
        </p>
        <p className="truncate text-[11px] text-[var(--fg-tertiary)]">
          {type.description}
        </p>
        {hasMultipleSourcePorts && (
          <div className="mt-1 flex flex-wrap gap-1">
            {type.sourcePorts.map((p) => (
              <span
                key={p.id}
                className="rounded px-1 py-0.5 text-[9px] font-medium bg-[var(--bg-sunken)] text-[var(--fg-quaternary)]"
              >
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
      <DropdownMenu
        open={nodeData.menuOpen ?? false}
        onOpenChange={(open) => nodeData.onMenuOpenChange?.(open)}
      >
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            className="nodrag shrink-0"
            onClick={(e) => e.stopPropagation()}
            aria-label="Opções do bloco"
          >
            <Settings2 className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => nodeData.onConfigure?.()}>
            <Settings2 className="size-3.5" />
            Configurar
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => nodeData.onDelete?.()}
            className="text-[var(--danger)] focus:text-[var(--danger)]"
          >
            <Trash2 className="size-3.5" />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {type.sourcePorts.length > 0 && (
        <SourceHandles ports={type.sourcePorts} />
      )}
    </div>
  );
}
