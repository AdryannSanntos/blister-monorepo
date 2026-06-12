"use client";

import { useTranslations } from "next-intl";

import type { AgentUsageDay } from "src/core/modules/agents/hooks/use-agent-runs-mock";
import { Heading } from "src/core/shared/components/ui/heading";
import { cn } from "src/core/shared/utils";

type AgentUsageChartProps = {
  data: AgentUsageDay[];
};

export const AgentUsageChart = ({ data }: AgentUsageChartProps) => {
  const t = useTranslations("agents.overview");
  const maxCount = Math.max(...data.map((entry) => entry.count), 1);

  return (
    <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-6">
      <Heading level="h6" as="h2" className="mb-6">
        {t("usageTitle")}
      </Heading>
      <div
        className="flex h-40 items-end gap-2 sm:gap-3"
        role="img"
        aria-label={t("usageAria")}
      >
        {data.map((entry) => {
          const height = entry.count === 0 ? 4 : Math.max(12, (entry.count / maxCount) * 100);

          return (
            <div
              key={entry.label}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-[11px] font-medium tabular-nums text-[var(--fg-tertiary)]">
                {entry.count}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full rounded-t-[var(--r-sm)] bg-[color-mix(in_oklch,var(--accent)_70%,transparent)] transition-all duration-[var(--dur-base)]",
                    entry.count === 0 && "bg-[var(--bg-sunken)]",
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="truncate text-[11px] capitalize text-[var(--fg-quaternary)]">
                {entry.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
