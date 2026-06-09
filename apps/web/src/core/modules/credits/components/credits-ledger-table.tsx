"use client";

import type { CreditLedgerEntry } from "@company-os/types";
import { Receipt } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { Badge } from "src/core/shared/components/ui/badge";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { cn } from "src/core/shared/utils";
import {
  formatCreditCurrency,
  formatCreditDate,
  getLedgerAmountSign,
  getLedgerAmountTone,
} from "../utils/credit-metrics";

type CreditsLedgerTableProps = {
  ledger: CreditLedgerEntry[];
  isLoading: boolean;
};

const ledgerTypeVariant = {
  CREDIT: "success",
  DEBIT: "destructive",
  ADJUST: "warning",
  REFUND: "info",
} as const;

const amountToneClasses = {
  danger: "text-[var(--danger)]",
  success: "text-[var(--success)]",
  default: "text-[var(--fg-primary)]",
} as const;

export function CreditsLedgerTable({
  ledger,
  isLoading,
}: CreditsLedgerTableProps) {
  const t = useTranslations("credits.page.ledger");
  const locale = useLocale();

  const columns = useMemo<ColumnDef<CreditLedgerEntry>[]>(
    () => [
      {
        accessorKey: "createdAt",
        header: t("columns.date"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-secondary)]">
            {formatCreditDate(row.original.createdAt, locale)}
          </span>
        ),
      },
      {
        accessorKey: "type",
        header: t("columns.type"),
        cell: ({ row }) => {
          const type = row.original.type;
          return (
            <Badge variant={ledgerTypeVariant[type]}>
              {t(`types.${type}`)}
            </Badge>
          );
        },
      },
      {
        accessorKey: "description",
        header: t("columns.description"),
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-[360px] text-[13px] text-[var(--fg-primary)]">
            {row.original.description || t("noDescription")}
          </span>
        ),
      },
      {
        accessorKey: "amount",
        header: t("columns.amount"),
        cell: ({ row }) => {
          const type = row.original.type;
          const sign = getLedgerAmountSign(type);
          const tone = getLedgerAmountTone(type);
          const amount = parseFloat(row.original.amount);

          return (
            <span
              className={cn(
                "font-medium tabular-nums text-[13px]",
                amountToneClasses[tone],
              )}
            >
              {sign}
              {formatCreditCurrency(amount, locale)}
            </span>
          );
        },
      },
      {
        accessorKey: "balanceAfter",
        header: t("columns.balanceAfter"),
        cell: ({ row }) => (
          <span className="tabular-nums text-[13px] text-[var(--fg-tertiary)]">
            {formatCreditCurrency(parseFloat(row.original.balanceAfter), locale)}
          </span>
        ),
      },
    ],
    [locale, t],
  );

  return (
    <SectionCard
      icon={Receipt}
      title={t("title")}
      description={t("description")}
    >
      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-[var(--r-lg)]" />
      ) : (
        <DataTable
          columns={columns}
          data={ledger}
          emptyState={{
            icon: Receipt,
            title: t("empty.title"),
            description: t("empty.description"),
          }}
        />
      )}
    </SectionCard>
  );
}
