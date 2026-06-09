"use client";

import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ChartColumn,
  Coins,
  Cpu,
  Database,
  Headphones,
  Shield,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";

import type { PlatformAdminTabValue } from "../hooks/use-platform-admin-tab";

export type PlatformAdminNavItem = {
  value: PlatformAdminTabValue;
  label: string;
  icon: LucideIcon;
  description: string;
  titleKey: string;
  descriptionKey: string;
};

export function usePlatformAdminNavItems(): PlatformAdminNavItem[] {
  const t = useTranslations("platformAdmin.nav");

  return useMemo(
    () => [
      {
        value: "overview",
        label: t("overview"),
        icon: ChartColumn,
        description: t("overviewDescription"),
        titleKey: "title",
        descriptionKey: "description",
      },
      {
        value: "admins",
        label: t("admins"),
        icon: Shield,
        description: t("adminsDescription"),
        titleKey: "adminsPage.title",
        descriptionKey: "adminsPage.description",
      },
      {
        value: "support",
        label: t("support"),
        icon: Headphones,
        description: t("supportDescription"),
        titleKey: "supportCard.title",
        descriptionKey: "supportCard.description",
      },
      {
        value: "agents",
        label: t("agents"),
        icon: Bot,
        description: t("agentsDescription"),
        titleKey: "agentsPage.title",
        descriptionKey: "agentsPage.description",
      },
      {
        value: "ai-catalog",
        label: t("aiCatalog"),
        icon: Cpu,
        description: t("aiCatalogDescription"),
        titleKey: "aiCatalogPage.title",
        descriptionKey: "aiCatalogPage.description",
      },
      {
        value: "rag",
        label: t("rag"),
        icon: Database,
        description: t("ragDescription"),
        titleKey: "ragPage.title",
        descriptionKey: "ragPage.description",
      },
      {
        value: "credits",
        label: t("credits"),
        icon: Coins,
        description: t("creditsDescription"),
        titleKey: "creditsPage.title",
        descriptionKey: "creditsPage.description",
      },
    ],
    [t],
  );
}

export function formatPlatformDate(
  value?: string | null,
  locale: string = "pt-BR",
) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatPlatformMoney(value?: number | null, currency = "USD") {
  const amount = value ?? 0;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function platformStatusVariant(status?: string | null) {
  switch (status) {
    case "active":
    case "success":
    case "accepted":
    case "completed":
      return "success" as const;
    case "running":
    case "queued":
    case "pending":
    case "draft":
      return "warning" as const;
    case "disabled":
    case "deprecated":
    case "error":
    case "failed":
    case "cancelled":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

export function PlatformAdminStatusBadge({
  status,
}: {
  status?: string | null;
}) {
  return <Badge variant={platformStatusVariant(status)}>{status ?? "-"}</Badge>;
}

export function PlatformAdminStatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="bg-[var(--bg-base)]">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardDescription className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--fg-quaternary)]">
            {label}
          </CardDescription>
          <CardTitle className="mt-2 text-[24px] tracking-[-0.03em]">
            {value}
          </CardTitle>
        </div>
        <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2">
          <Icon className="size-4 text-[var(--fg-secondary)]" />
        </div>
      </CardHeader>
      <CardContent className="pt-0 text-[12px] text-[var(--fg-tertiary)]">
        {hint}
      </CardContent>
    </Card>
  );
}
