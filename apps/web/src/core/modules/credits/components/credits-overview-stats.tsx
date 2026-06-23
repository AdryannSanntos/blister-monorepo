"use client";

import {
  ArrowDownLeft,
  Coins,
  History,
  ShieldCheck,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { DashboardStatCard } from "src/core/modules/dashboard/components/dashboard-stat-card";
import {
  computeCreditPageMetrics,
  formatCreditCurrency,
} from "../utils/credit-metrics";
import type { CreditSummary } from "@company-os/types";
import { FREE_TIER_CREDITS } from "@company-os/types";

type CreditsOverviewStatsProps = {
  data: CreditSummary | undefined;
  isLoading: boolean;
};

export function CreditsOverviewStats({
  data,
  isLoading,
}: CreditsOverviewStatsProps) {
  const t = useTranslations("credits.page.kpi");
  const locale = useLocale();

  const metrics = computeCreditPageMetrics(
    data?.balance?.amount,
    data?.balance?.updatedAt,
    data?.ledger ?? [],
  );

  const balanceFormatted = formatCreditCurrency(metrics.balance, locale);
  const spentFormatted = formatCreditCurrency(metrics.spentLast30Days, locale);
  const isLowBalance = metrics.balance < 2;
  // Heuristic free-tier indicator: no top-ups recorded means the balance is
  // still the granted free tier (1 credit = US$1, FREE_TIER_CREDITS of usage).
  const isFreeTier = metrics.creditedLast30Days === 0;
  const balanceHint = isLowBalance
    ? t("balance.lowHint")
    : isFreeTier
      ? t("balance.freeTier", { amount: FREE_TIER_CREDITS })
      : t("balance.hint");

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard
        label={t("balance.label")}
        value={balanceFormatted}
        hint={balanceHint}
        icon={Coins}
        isLoading={isLoading}
        tone={isLowBalance ? "danger" : "default"}
      />
      <DashboardStatCard
        label={t("spent.label")}
        value={spentFormatted}
        hint={t("spent.hint")}
        icon={ArrowDownLeft}
        isLoading={isLoading}
        tone={metrics.spentLast30Days > 0 ? "warning" : "default"}
      />
      <DashboardStatCard
        label={t("transactions.label")}
        value={String(metrics.transactionCount)}
        hint={t("transactions.hint")}
        icon={History}
        isLoading={isLoading}
      />
      <DashboardStatCard
        label={t("status.label")}
        value={isLowBalance ? t("status.low") : t("status.active")}
        hint={isLowBalance ? t("status.lowHint") : t("status.activeHint")}
        icon={ShieldCheck}
        isLoading={isLoading}
        tone={isLowBalance ? "danger" : "success"}
      />
    </div>
  );
}
