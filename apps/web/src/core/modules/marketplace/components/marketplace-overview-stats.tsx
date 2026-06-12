"use client";

import { Coins, Gift, Library, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { DashboardStatCard } from "src/core/modules/dashboard/components/dashboard-stat-card";

import type { MarketplaceCatalogStats } from "../utils/marketplace-catalog.utils";

type MarketplaceOverviewStatsProps = {
  stats: MarketplaceCatalogStats;
  isLoading?: boolean;
};

export const MarketplaceOverviewStats = ({
  stats,
  isLoading = false,
}: MarketplaceOverviewStatsProps) => {
  const t = useTranslations("marketplace.stats");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label={t("credits.label")}
        value={String(stats.credits)}
        hint={t("credits.hint")}
        icon={Coins}
        isLoading={isLoading}
        tone={stats.credits < 80 ? "warning" : "default"}
      />
      <DashboardStatCard
        label={t("free.label")}
        value={String(stats.freeAvailable)}
        hint={t("free.hint")}
        icon={Gift}
        isLoading={isLoading}
        tone="success"
      />
      <DashboardStatCard
        label={t("paid.label")}
        value={String(stats.paidAvailable)}
        hint={t("paid.hint")}
        icon={Sparkles}
        isLoading={isLoading}
      />
      <DashboardStatCard
        label={t("library.label")}
        value={String(stats.ownedCount)}
        hint={t("library.hint")}
        icon={Library}
        isLoading={isLoading}
      />
    </div>
  );
};
