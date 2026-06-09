"use client";

import { Brain, Database } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { BrandBrainProgressSummary } from "src/core/modules/brand/components/brand-brain-progress-summary";
import { useBrandBrainProgress } from "src/core/modules/brand/hooks/use-brand-brain-progress";
import { useCompanyRagStatus } from "../hooks/use-company-rag-status";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Button } from "src/core/shared/components/ui/button";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Badge } from "src/core/shared/components/ui/badge";

export function DashboardBrandMemoryPanel() {
  const t = useTranslations("dashboard.homePage.brandMemory");
  const { progress, isLoading: isBrandLoading } = useBrandBrainProgress();
  const { data: ragStatus, isLoading: isRagLoading } = useCompanyRagStatus();

  const isLoading = isBrandLoading || isRagLoading;

  const ragVariant = ragStatus?.isSynced
    ? ("success" as const)
    : ragStatus && ragStatus.staleCount > 0
      ? ("warning" as const)
      : ("secondary" as const);

  const ragLabel = ragStatus?.isSynced
    ? t("ragSynced")
    : ragStatus && ragStatus.staleCount > 0
      ? t("ragStale", { count: ragStatus.staleCount })
      : t("ragPending");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SectionCard
        icon={Brain}
        title={t("brandTitle")}
        description={t("brandDescription")}
      >
        {isBrandLoading ? (
          <Skeleton className="h-[88px] w-full rounded-xl" />
        ) : progress ? (
          <BrandBrainProgressSummary progress={progress} />
        ) : (
          <p className="text-[13px] text-[var(--fg-tertiary)]">{t("brandEmpty")}</p>
        )}
        <div className="mt-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/brand">{t("completeBrand")}</Link>
          </Button>
        </div>
      </SectionCard>

      <SectionCard
        icon={Database}
        title={t("memoryTitle")}
        description={t("memoryDescription")}
      >
        {isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full max-w-[280px]" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={ragVariant}>{ragLabel}</Badge>
              {ragStatus ? (
                <span className="text-[12px] text-[var(--fg-tertiary)]">
                  {t("sourcesIndexed", { count: ragStatus.sources.length })}
                </span>
              ) : null}
            </div>
            <p className="text-[13px] leading-relaxed text-[var(--fg-secondary)]">
              {ragStatus?.isSynced ? t("memoryReadyHint") : t("memoryPendingHint")}
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
