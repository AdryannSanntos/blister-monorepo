"use client";

import { BarChart3 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { getAgentById } from "src/core/modules/blister-os/fixtures/agents-catalog.fixture";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";

import { useAgentSpend } from "../hooks/use-agent-spend";
import { formatCreditCurrency } from "../utils/credit-metrics";

function humanizeAgentId(agentId: string) {
  return agentId
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CreditsAgentSpend() {
  const t = useTranslations("credits.page.agentSpend");
  const locale = useLocale();
  const { data, isLoading } = useAgentSpend();

  const items = data?.items ?? [];
  const maxSpent = items.reduce(
    (max, item) => Math.max(max, Number(item.totalSpent)),
    0,
  );

  return (
    <SectionCard
      icon={BarChart3}
      title={t("title")}
      description={t("description")}
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-14 w-full rounded-[var(--r-md)]" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-6 text-center">
          <p className="text-[14px] font-medium text-[var(--fg-primary)]">
            {t("empty.title")}
          </p>
          <p className="mt-1 text-[12px] text-[var(--fg-tertiary)]">
            {t("empty.description")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => {
            const agent = getAgentById(item.agentId);
            const Icon = agent?.icon ?? BarChart3;
            const name = agent?.name ?? humanizeAgentId(item.agentId);
            const spent = Number(item.totalSpent);
            const ratio = maxSpent > 0 ? Math.max(0.04, spent / maxSpent) : 0;

            return (
              <li
                key={item.agentId}
                className="flex items-center gap-3 rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--r-md)] bg-[var(--bg-sunken)] text-[var(--fg-secondary)]">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                      {name}
                    </p>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums text-[var(--fg-primary)]">
                      {formatCreditCurrency(spent, locale)}
                    </p>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-sunken)]">
                      <div
                        className={cn("h-full rounded-full bg-[var(--accent)]")}
                        style={{ width: `${Math.round(ratio * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-[var(--fg-tertiary)]">
                      {t("runsLabel", { count: item.runs })}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
