"use client";

import { Coins, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { AGENT_UI_CONFIG, AGENT_UI_IDS } from "../config/agent-ui-config";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Link } from "@/i18n/routing";
import { Button } from "src/core/shared/components/ui/button";

export function CreditsPage() {
  const t = useTranslations("agents.creditsPage");
  const tAgents = useTranslations("agents");
  const { data, isLoading } = useCredits();

  const balance = data?.balance?.amount
    ? parseFloat(data.balance.amount).toFixed(2)
    : "0.00";

  const isLow = parseFloat(balance) < 2;

  return (
    <PageLayout
      icon={Coins}
      title={t("title")}
      description={t("description")}
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
          <CardHeader className="p-6">
            <CardTitle className="text-[16px] font-medium text-[var(--fg-primary)]">
              {t("balanceTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-0">
            {isLoading ? (
              <Skeleton className="h-16 w-40" />
            ) : (
              <div className="flex flex-col gap-2">
                <p
                  className={`text-[40px] font-medium tabular-nums tracking-[-0.03em] ${
                    isLow ? "text-[var(--danger)]" : "text-[var(--fg-primary)]"
                  }`}
                >
                  US$ {balance}
                </p>
                <p className="text-[14px] text-[var(--fg-tertiary)]">
                  {isLow ? t("lowBalanceHint") : t("balanceHint")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
          <CardHeader className="p-6">
            <CardTitle className="flex items-center gap-2 text-[16px] font-medium text-[var(--fg-primary)]">
              <Sparkles className="size-4 text-[var(--accent)]" />
              {t("costsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 px-6 pb-6 pt-0">
            {AGENT_UI_IDS.map((agentId) => {
              const config = AGENT_UI_CONFIG[agentId];
              const Icon = config.icon;
              return (
                <div
                  key={agentId}
                  className="flex items-center justify-between rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="size-4 text-[var(--accent)]" />
                    <span className="text-[14px] text-[var(--fg-primary)]">
                      {tAgents(agentId)}
                    </span>
                  </div>
                  <span className="text-[13px] tabular-nums text-[var(--fg-tertiary)]">
                    ~US$ {(config.estimatedCredits ?? 0).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
        <CardContent className="flex flex-col items-start gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[16px] font-medium text-[var(--fg-primary)]">
              {t("rechargeTitle")}
            </p>
            <p className="mt-1 text-[14px] text-[var(--fg-tertiary)]">
              {t("rechargeDescription")}
            </p>
          </div>
          <Button variant="outline" disabled>
            {t("rechargeButton")}
          </Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
