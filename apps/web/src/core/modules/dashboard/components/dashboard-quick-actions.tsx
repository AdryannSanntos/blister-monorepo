"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { DASHBOARD_AGENT_NAV_ITEMS } from "../config/dashboard-agents";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Button } from "src/core/shared/components/ui/button";

export function DashboardQuickActions() {
  const t = useTranslations("dashboard.homePage.quickActions");
  const tAgents = useTranslations("agents");

  return (
    <SectionCard
      icon={Sparkles}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-2">
        {DASHBOARD_AGENT_NAV_ITEMS.map((agent) => {
          const Icon = agent.icon;
          return (
            <Link
              key={agent.id}
              href={agent.href}
              className="group flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 transition-colors hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
                  <Icon className="size-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                    {tAgents(agent.id)}
                  </p>
                  <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                    {tAgents(`${agent.id}Description`)}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 shrink-0 text-[var(--fg-quaternary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-secondary)]" />
            </Link>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/campaigns">{t("viewCampaigns")}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/brand">{t("viewBrandBrain")}</Link>
        </Button>
      </div>
    </SectionCard>
  );
}
