"use client";

import { AlertTriangle, Coins, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/routing";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Button } from "src/core/shared/components/ui/button";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "src/core/shared/components/ui/alert";

import { CreditsAgentSpend } from "../components/credits-agent-spend";
import { CreditsCostGuide } from "../components/credits-cost-guide";
import { CreditsHowItWorks } from "../components/credits-how-it-works";
import { CreditsLedgerTable } from "../components/credits-ledger-table";
import { CreditsOverviewStats } from "../components/credits-overview-stats";
import { CreditsRechargePanel } from "../components/credits-recharge-panel";
import { computeCreditPageMetrics } from "../utils/credit-metrics";

export function CreditsPage() {
  const t = useTranslations("credits.page");
  const { data, isLoading } = useCredits();

  const metrics = computeCreditPageMetrics(
    data?.balance?.amount,
    data?.balance?.updatedAt,
    data?.ledger ?? [],
  );
  const isLowBalance = metrics.balance < 2;

  return (
    <PageLayout
      icon={Coins}
      title={t("title")}
      description={t("description")}
      actions={
        <Button asChild>
          <Link href="/dashboard/agents/cuts">
            <Sparkles className="size-4" />
            {t("primaryAction")}
          </Link>
        </Button>
      }
      afterHeader={
        isLowBalance && !isLoading ? (
          <Alert variant="warning">
            <AlertTriangle />
            <AlertTitle>{t("lowBalanceAlert.title")}</AlertTitle>
            <AlertDescription>{t("lowBalanceAlert.description")}</AlertDescription>
          </Alert>
        ) : null
      }
    >
      <CreditsOverviewStats data={data} isLoading={isLoading} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <CreditsAgentSpend />
        <div className="flex flex-col gap-4">
          <CreditsHowItWorks />
          <CreditsRechargePanel />
        </div>
      </div>

      <CreditsCostGuide />

      <CreditsLedgerTable ledger={data?.ledger ?? []} isLoading={isLoading} />
    </PageLayout>
  );
}
