"use client";

import type { LucideIcon } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";

type DashboardStatCardProps = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  isLoading?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
  className?: string;
};

const toneClasses = {
  default: "text-[var(--fg-primary)]",
  success: "text-[var(--success)]",
  warning: "text-[var(--warning)]",
  danger: "text-[var(--danger)]",
} as const;

export function DashboardStatCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading = false,
  tone = "default",
  className,
}: DashboardStatCardProps) {
  return (
    <Card
      className={cn(
        "border-[var(--line-default)] bg-[var(--bg-base)]",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            {label}
          </CardDescription>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-24" />
          ) : (
            <CardTitle
              className={cn(
                "mt-2 text-[24px] font-medium tracking-[-0.03em] tabular-nums",
                toneClasses[tone],
              )}
            >
              {value}
            </CardTitle>
          )}
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2">
          <Icon className="size-4 text-[var(--fg-secondary)]" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-[12px] text-[var(--fg-tertiary)]">
        {isLoading ? <Skeleton className="h-4 w-full max-w-[220px]" /> : hint}
      </CardContent>
    </Card>
  );
}
