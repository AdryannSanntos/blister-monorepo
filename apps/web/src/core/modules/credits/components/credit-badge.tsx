"use client";

import { Coins } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";

export function CreditBadge() {
  const t = useTranslations("credits");
  const { data, isLoading } = useCredits();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-sunken)] px-3 py-1 text-xs text-[var(--fg-secondary)]">
        <Coins className="h-3.5 w-3.5" />
        <span>—</span>
      </div>
    );
  }

  const amount = data?.balance?.amount
    ? parseFloat(data.balance.amount).toFixed(2)
    : "0.00";
  const isLow = parseFloat(amount) < 2;

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        isLow
          ? "bg-[var(--danger-soft)] text-[var(--danger-soft-text)]"
          : "bg-[var(--bg-sunken)] text-[var(--fg-secondary)]"
      }`}
      title={t("balanceTitle", { amount })}
    >
      <Coins className="h-3.5 w-3.5" />
      <span>US$ {amount}</span>
    </div>
  );
}
