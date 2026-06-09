import type { CreditLedgerEntry } from "@company-os/types";

export type CreditPageMetrics = {
  balance: number;
  spentLast30Days: number;
  creditedLast30Days: number;
  transactionCount: number;
  lastUpdatedAt: string | null;
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function computeCreditPageMetrics(
  balanceAmount: string | undefined,
  balanceUpdatedAt: string | undefined,
  ledger: CreditLedgerEntry[],
): CreditPageMetrics {
  const now = Date.now();
  const thirtyDaysAgo = now - THIRTY_DAYS_MS;

  let spentLast30Days = 0;
  let creditedLast30Days = 0;

  for (const entry of ledger) {
    const createdAt = new Date(entry.createdAt).getTime();
    if (createdAt < thirtyDaysAgo) continue;

    const amount = parseFloat(entry.amount);

    if (entry.type === "DEBIT") {
      spentLast30Days += amount;
    } else if (entry.type === "CREDIT" || entry.type === "REFUND") {
      creditedLast30Days += amount;
    }
  }

  return {
    balance: balanceAmount ? parseFloat(balanceAmount) : 0,
    spentLast30Days,
    creditedLast30Days,
    transactionCount: ledger.length,
    lastUpdatedAt: balanceUpdatedAt ?? null,
  };
}

export function formatCreditCurrency(value: number, locale: string) {
  return new Intl.NumberFormat(locale === "pt-BR" ? "en-US" : locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCreditDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function getLedgerAmountSign(type: CreditLedgerEntry["type"]) {
  if (type === "DEBIT") return "-" as const;
  if (type === "CREDIT" || type === "REFUND") return "+" as const;
  return "" as const;
}

export function getLedgerAmountTone(type: CreditLedgerEntry["type"]) {
  if (type === "DEBIT") return "danger" as const;
  if (type === "CREDIT" || type === "REFUND") return "success" as const;
  return "default" as const;
}
