"use client";

import { CircleDollarSign } from "lucide-react";
import { useTranslations } from "next-intl";

import { SectionCard } from "src/core/shared/components/ui/section-card";

const STEP_KEYS = ["step1", "step2", "step3"] as const;

export function CreditsHowItWorks() {
  const t = useTranslations("credits.page.howItWorks");

  return (
    <SectionCard
      icon={CircleDollarSign}
      title={t("title")}
      description={t("description")}
    >
      <ol className="flex flex-col gap-3">
        {STEP_KEYS.map((stepKey, index) => (
          <li
            key={stepKey}
            className="flex items-start gap-3 rounded-[var(--r-md)] border border-[var(--line-subtle)] px-4 py-3"
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--bg-sunken)] text-[11px] font-bold tabular-nums text-[var(--fg-secondary)]">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-[var(--fg-primary)]">
                {t(`${stepKey}.title`)}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--fg-tertiary)]">
                {t(`${stepKey}.description`)}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
