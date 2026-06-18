"use client";

import { ArrowRight, Scissors } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { SectionCard } from "src/core/shared/components/ui/section-card";

export function DashboardQuickActions() {
  const t = useTranslations("dashboard.homePage.quickActions");

  return (
    <SectionCard
      icon={Scissors}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-2">
        <Link
          href="/dashboard/agents/cuts/new"
          className="group flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3 transition-colors hover:border-[var(--line-default)] hover:bg-[var(--bg-hover)]"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="rounded-[var(--r-sm)] bg-[var(--accent-soft)] p-1.5">
              <Scissors className="size-4 text-[var(--accent)]" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-medium text-[var(--fg-primary)]">
                {t("cutsLabel")}
              </p>
              <p className="truncate text-[12px] text-[var(--fg-tertiary)]">
                {t("cutsDescription")}
              </p>
            </div>
          </div>
          <ArrowRight className="size-4 shrink-0 text-[var(--fg-quaternary)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg-secondary)]" />
        </Link>
      </div>
    </SectionCard>
  );
}
