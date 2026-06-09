"use client";

import type { LucideIcon } from "lucide-react";

import { TabsTrigger } from "src/core/shared/components/ui/tabs";
import { cn } from "src/core/shared/utils";

type AgentTabTriggerProps = {
  value: string;
  label: string;
  icon: LucideIcon;
};

export function AgentTabTrigger({ value, label, icon: Icon }: AgentTabTriggerProps) {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        "gap-1.5 border-[1.5px] border-solid transition-[background,color,border-color] duration-[var(--dur-fast)]",
        "data-[state=inactive]:border-[var(--line-subtle)] data-[state=inactive]:bg-[var(--bg-sunken)] data-[state=inactive]:text-[var(--fg-primary)]",
        "data-[state=active]:!border-[var(--accent)] data-[state=active]:!bg-[var(--accent-soft)] data-[state=active]:!text-[var(--accent-soft-text)]",
        "hover:brightness-[0.98]",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
    </TabsTrigger>
  );
}
