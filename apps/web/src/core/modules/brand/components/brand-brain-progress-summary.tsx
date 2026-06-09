"use client";

import type { BrandBrainProgress } from "@company-os/types";
import { getBrandBrainProgressTone } from "@company-os/types";
import { useTranslations } from "next-intl";

import { cn } from "src/core/shared/utils";

type BrandBrainProgressSummaryProps = {
  progress: BrandBrainProgress;
  className?: string;
};

export function BrandBrainProgressSummary({
  progress,
  className,
}: BrandBrainProgressSummaryProps) {
  const t = useTranslations("brand.progress");
  const tone = getBrandBrainProgressTone(progress.overall.percent);

  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-base)] p-4",
        className,
      )}
      style={{
        borderColor: tone.isComplete
          ? "color-mix(in srgb, var(--success-600) 35%, var(--line-default))"
          : tone.tabBorder,
      }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-[var(--fg-primary)]">
            {t("title")}
          </p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-tertiary)]">
            {t("description", {
              filled: progress.overall.filled,
              total: progress.overall.total,
            })}
          </p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[12px] font-bold tabular-nums"
          style={{
            backgroundColor: tone.badgeBackground,
            color: tone.badgeText,
          }}
        >
          {progress.overall.percent}%
        </span>
      </div>

      <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--bg-sunken)]">
        <div
          className="h-full min-w-0 rounded-full transition-all duration-300"
          style={{
            width: `${Math.max(progress.overall.percent, progress.overall.filled > 0 ? 4 : 0)}%`,
            backgroundColor: tone.trackColor,
          }}
        />
      </div>
    </div>
  );
}
