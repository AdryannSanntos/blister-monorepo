"use client";

import type { LucideIcon } from "lucide-react";
import type * as React from "react";

import { TableCell, TableRow } from "src/core/shared/components/ui/table";
import { cn } from "src/core/shared/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
  contentClassName?: string;
  compact?: boolean;
};

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  note,
  className,
  contentClassName,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[var(--r-xl)] border border-dashed border-[var(--line-default)] bg-[var(--bg-base)] px-6 py-16 text-center",
        compact && "px-5 py-10",
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-raised)]">
        <Icon className="size-7 text-[var(--fg-tertiary)]" />
      </div>

      <div className={cn("space-y-1", contentClassName)}>
        <p className="text-[15px] font-medium text-[var(--fg-primary)]">
          {title}
        </p>
        <div className="max-w-sm text-[13px] text-[var(--fg-tertiary)]">
          {description}
        </div>
      </div>

      {action}

      {note ? (
        <div className="text-[12px] text-[var(--fg-quaternary)]">{note}</div>
      ) : null}
    </div>
  );
}

type TableEmptyStateProps = EmptyStateProps & {
  colSpan: number;
  cellClassName?: string;
};

function TableEmptyState({
  colSpan,
  cellClassName,
  ...props
}: TableEmptyStateProps) {
  return (
    <TableRow>
      <TableCell
        colSpan={colSpan}
        className={cn("p-6 align-middle whitespace-normal", cellClassName)}
      >
        <EmptyState {...props} compact />
      </TableCell>
    </TableRow>
  );
}

export { EmptyState, TableEmptyState };
