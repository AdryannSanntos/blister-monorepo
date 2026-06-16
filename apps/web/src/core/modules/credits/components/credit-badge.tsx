"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { cn } from "src/core/shared/utils";

type CreditBadgeProps = {
  compact?: boolean;
};

export function CreditBadge({ compact = false }: CreditBadgeProps) {
  const t = useTranslations("credits");
  const { data, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] text-xs text-[var(--fg-secondary)]",
          compact ? "px-2 py-1" : "px-3 py-1",
        )}
      >
        <Coins className="h-3.5 w-3.5" />
        <span className={cn(compact && "sr-only sm:not-sr-only")}>—</span>
      </div>
    );
  }

  const amount = data?.balance?.amount
    ? parseFloat(data.balance.amount).toFixed(2)
    : "0.00";
  const isLow = parseFloat(amount) < 2;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-full text-xs font-medium transition-colors",
        compact ? "px-2 py-1" : "px-3 py-1",
        isLow
          ? "bg-[var(--danger-soft)] text-[var(--danger-soft-text)]"
          : "bg-[var(--bg-sunken)] text-[var(--fg-secondary)]",
      )}
      title={t("balanceTitle", { amount })}
    >
      <Coins className="h-3.5 w-3.5 shrink-0" />
      <span className={cn(compact && "hidden min-[420px]:inline")}>
        US$ {amount}
      </span>
    </div>
  );
}
