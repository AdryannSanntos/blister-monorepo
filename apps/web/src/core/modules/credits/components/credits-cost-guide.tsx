"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import {
  AGENT_UI_CONFIG,
  AGENT_UI_IDS,
} from "src/core/modules/agents/config/agent-ui-config";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Badge } from "src/core/shared/components/ui/badge";

export function CreditsCostGuide() {
  const t = useTranslations("credits.page.costs");
  const tAgents = useTranslations("agents");

  return (
    <SectionCard
      icon={Sparkles}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-2">
        {AGENT_UI_IDS.map((agentId) => {
          const config = AGENT_UI_CONFIG[agentId];
          const Icon = config.icon;
          const estimatedCost = config.estimatedCredits ?? 0;

          return (
            <Link
              key={agentId}
              href={`/dashboard/agents/${agentId}`}
              className="group flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 transition-colors hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
                  <Icon className="size-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                    {tAgents(agentId)}
                  </p>
                  <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                    {tAgents(`${agentId}Description`)}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge variant="secondary" className="tabular-nums">
                  ~US$ {estimatedCost.toFixed(2)}
                </Badge>
                <ArrowRight className="size-4 text-[var(--fg-quaternary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-secondary)]" />
              </div>
            </Link>
          );
        })}
      </div>
      <p className="mt-4 text-[12px] leading-relaxed text-[var(--fg-quaternary)]">
        {t("footnote")}
      </p>
    </SectionCard>
  );
}
