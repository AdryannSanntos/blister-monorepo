"use client";

import type { AiModel, AiProvider } from "@company-os/types";
import { Box, Cpu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

import { useAiModels, useAiProviders } from "../hooks/use-ai-catalog";

export function AiCatalogTab() {
  const t = useTranslations("platformAdmin.aiCatalogTab");
  const tc = useTranslations("common");
  const { data: providers, isLoading: loadingProviders } = useAiProviders();
  const { data: models, isLoading: loadingModels } = useAiModels();

  const providerColumns: ColumnDef<AiProvider>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("nameColumn"),
        meta: { label: t("nameColumn") },
      },
      {
        accessorKey: "slug",
        header: t("slugColumn"),
        meta: { label: t("slugColumn") },
        cell: ({ row }) => (
          <code className="rounded bg-[var(--bg-sunken)] px-1.5 py-0.5 text-xs">
            {row.original.slug}
          </code>
        ),
      },
      {
        accessorKey: "isEnabled",
        header: t("statusColumn"),
        meta: { label: t("statusColumn") },
        cell: ({ row }) => (
          <Badge variant={row.original.isEnabled ? "default" : "outline"}>
            {row.original.isEnabled ? tc("active") : tc("inactive")}
          </Badge>
        ),
      },
    ],
    [t, tc],
  );

  const modelColumns: ColumnDef<AiModel>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("nameColumn"),
        meta: { label: t("nameColumn") },
      },
      {
        accessorKey: "externalId",
        header: t("externalIdColumn"),
        meta: { label: t("externalIdColumn") },
        cell: ({ row }) => (
          <span className="text-xs text-[var(--fg-secondary)]">
            {row.original.externalId}
          </span>
        ),
      },
      {
        accessorKey: "inputCostPer1k",
        header: t("inputCostColumn"),
        meta: { label: t("inputCostColumn") },
        cell: ({ row }) => `$${row.original.inputCostPer1k}/1k`,
      },
      {
        accessorKey: "outputCostPer1k",
        header: t("outputCostColumn"),
        meta: { label: t("outputCostColumn") },
        cell: ({ row }) => `$${row.original.outputCostPer1k}/1k`,
      },
      {
        accessorKey: "isEnabled",
        header: t("statusColumn"),
        meta: { label: t("statusColumn") },
        cell: ({ row }) => (
          <Badge variant={row.original.isEnabled ? "default" : "outline"}>
            {row.original.isEnabled ? tc("active") : tc("inactive")}
          </Badge>
        ),
      },
    ],
    [t, tc],
  );

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">{t("providersTitle")}</h3>
        {loadingProviders ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <DataTable
            columns={providerColumns}
            data={providers ?? []}
            emptyState={{
              icon: Cpu,
              title: t("noProviders"),
              description: t("noProvidersDescription"),
            }}
          />
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h3 className="text-sm font-medium">{t("modelsTitle")}</h3>
        {loadingModels ? (
          <Skeleton className="h-20 w-full" />
        ) : (
          <DataTable
            columns={modelColumns}
            data={models ?? []}
            emptyState={{
              icon: Box,
              title: t("noModels"),
              description: t("noModelsDescription"),
            }}
          />
        )}
      </section>
    </div>
  );
}
