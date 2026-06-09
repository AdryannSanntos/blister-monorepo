"use client";

import { Wallet } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";

export function CreditsRechargePanel() {
  const t = useTranslations("credits.page.recharge");

  return (
    <SectionCard
      icon={Wallet}
      title={t("title")}
      description={t("description")}
    >
      <div className="flex flex-col gap-4">
        <div className="rounded-[var(--r-md)] border border-dashed border-[var(--line-default)] bg-[var(--bg-sunken)] px-4 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{t("comingSoon")}</Badge>
            <span className="text-[12px] text-[var(--fg-tertiary)]">
              {t("phaseHint")}
            </span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-[var(--fg-secondary)]">
            {t("body")}
          </p>
        </div>
        <Button variant="outline" disabled className="w-fit">
          {t("button")}
        </Button>
      </div>
    </SectionCard>
  );
}
