"use client";

import type { BrandBrainTab } from "@company-os/types";
import { getBrandBrainProgressTone } from "@company-os/types";
import type { LucideIcon } from "lucide-react";

import { TabsTrigger } from "src/core/shared/components/ui/tabs";
import { cn } from "src/core/shared/utils";

type BrandBrainTabTriggerProps = {
  value: BrandBrainTab;
  label: string;
  icon: LucideIcon;
  percent: number;
  brainComplete: boolean;
};

export function BrandBrainTabTrigger({
  value,
  label,
  icon: Icon,
  percent,
  brainComplete,
}: BrandBrainTabTriggerProps) {
  if (brainComplete) {
    return (
      <TabsTrigger value={value} className="gap-1.5">
        <Icon className="size-4 shrink-0" />
        <span>{label}</span>
      </TabsTrigger>
    );
  }

  const tone = getBrandBrainProgressTone(percent);

  return (
    <TabsTrigger
      value={value}
      className={cn(
        "gap-1.5 border-[1.5px] border-solid transition-[background,color,border-color] duration-[var(--dur-fast)]",
        "data-[state=inactive]:text-[var(--fg-primary)]",
        "data-[state=active]:!border-[var(--accent)] data-[state=active]:!text-[var(--accent-soft-text)]",
        "hover:brightness-[0.98]",
      )}
      style={{
        backgroundColor: tone.tabBackground,
        borderColor: tone.tabBorder,
      }}
    >
      <Icon className="size-4 shrink-0" />
      <span>{label}</span>
      <span
        className="rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums"
        style={{
          backgroundColor: tone.badgeBackground,
          color: tone.badgeText,
        }}
      >
        {percent}%
      </span>
    </TabsTrigger>
  );
}
