"use client";

import { AlertTriangle, Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "src/core/shared/components/ui/button";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Link } from "@/i18n/routing";

type MarketplaceCreditBannerProps = {
  credits: number;
};

export const MarketplaceCreditBanner = ({
  credits,
}: MarketplaceCreditBannerProps) => {
  const t = useTranslations("marketplace.creditBanner");
  const isLowBalance = credits < 80;

  return (
    <Card className="border-[var(--line-default)] bg-[var(--bg-base)]">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2.5">
            <Coins className="size-4 text-[var(--accent)]" aria-hidden />
          </div>
          <div className="space-y-1">
            <Paragraph className="font-medium text-[var(--fg-primary)]">
              {t("title", { credits })}
            </Paragraph>
            <Paragraph size="p5" tone="tertiary">
              {isLowBalance ? t("lowDescription") : t("description")}
            </Paragraph>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLowBalance ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning-soft)] px-3 py-1 text-xs font-medium text-[var(--warning-soft-text)]">
              <AlertTriangle className="size-3.5" aria-hidden />
              {t("lowBadge")}
            </span>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/credits">{t("action")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
