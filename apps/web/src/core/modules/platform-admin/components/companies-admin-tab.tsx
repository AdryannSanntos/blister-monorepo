"use client";

import type { PlatformCompany } from "@company-os/types";
import { Building2, Copy, Eye, Plus, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  type ColumnDef,
  DataTable,
  type DataTableFilter,
} from "src/core/shared/components/ui/data-table";
import { TableRowActionsMenu } from "src/core/shared/components/ui/table-row-actions-menu";
import { Link, useRouter } from "@/i18n/routing";

import {
  PlatformAdminStatCard,
  formatPlatformDate,
} from "./platform-admin-primitives";
import { usePlatformCompanies } from "../hooks/use-platform-settings";

type CompaniesAdminTabProps = {
  onCreateCompany: () => void;
};

function CompanyRowActions({ company }: { company: PlatformCompany }) {
  const t = useTranslations("platformAdmin.companiesPage");
  const router = useRouter();

  const handleCopyOwnerEmail = async () => {
    await navigator.clipboard.writeText(company.ownerEmail);
    toast.success(t("copyEmailSuccess"));
  };

  return (
    <TableRowActionsMenu
      ariaLabel={t("actionsColumn")}
      items={[
        {
          id: "view",
          label: t("viewDetails"),
          icon: Eye,
          onClick: () => router.push(`/admin/companies/${company.id}`),
        },
        {
          id: "copy-email",
          label: t("copyOwnerEmail"),
          icon: Copy,
          onClick: handleCopyOwnerEmail,
        },
      ]}
    />
  );
}

export function CompaniesAdminTab({ onCreateCompany }: CompaniesAdminTabProps) {
  const locale = useLocale();
  const t = useTranslations("platformAdmin.companiesPage");
  const { data, isLoading } = usePlatformCompanies(1, 100);

  const rows = data?.items ?? [];
  const total = data?.total ?? rows.length;
  const onboarded = rows.filter((item) => item.onboardingCompletedAt).length;
  const pendingOnboarding = total - onboarded;

  const columns: ColumnDef<PlatformCompany>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: t("nameColumn"),
        meta: { label: t("nameColumn") },
        cell: ({ row }) => (
          <div>
            <Link
              href={`/admin/companies/${row.original.id}`}
              className="text-[13px] font-medium text-[var(--fg-primary)] hover:underline"
            >
              {row.original.name}
            </Link>
            <p className="text-[12px] text-[var(--fg-tertiary)]">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "ownerEmail",
        header: t("ownerEmailColumn"),
        meta: { label: t("ownerEmailColumn") },
        cell: ({ row }) => (
          <span className="text-xs text-[var(--fg-secondary)]">
            {row.original.ownerEmail}
          </span>
        ),
      },
      {
        accessorKey: "creditBalance",
        header: t("balanceColumn"),
        meta: { label: t("balanceColumn") },
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            US${" "}
            {row.original.creditBalance
              ? parseFloat(row.original.creditBalance).toFixed(2)
              : "0.00"}
          </span>
        ),
      },
      {
        accessorKey: "onboardingCompletedAt",
        header: t("statusColumn"),
        meta: { label: t("statusColumn") },
        cell: ({ row }) => (
          <Badge variant={row.original.onboardingCompletedAt ? "success" : "warning"}>
            {row.original.onboardingCompletedAt ? t("statusActive") : t("statusPending")}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: t("createdAtColumn"),
        meta: { label: t("createdAtColumn") },
        cell: ({ row }) => formatPlatformDate(row.original.createdAt, locale),
      },
    ],
    [locale, t],
  );

  const filters: DataTableFilter<PlatformCompany>[] = useMemo(
    () => [
      {
        id: "status",
        label: t("statusColumn"),
        options: [
          {
            label: t("statusActive"),
            value: "active",
            predicate: (row) => Boolean(row.onboardingCompletedAt),
          },
          {
            label: t("statusPending"),
            value: "pending",
            predicate: (row) => !row.onboardingCompletedAt,
          },
        ],
      },
    ],
    [t],
  );

  const tableColumns = useMemo<ColumnDef<PlatformCompany>[]>(
    () => [
      ...columns,
      {
        id: "actions",
        header: "",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => <CompanyRowActions company={row.original} />,
      },
    ],
    [columns],
  );

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-lg bg-[var(--bg-sunken)]" />;
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        <PlatformAdminStatCard
          label={t("kpiTotal")}
          value={String(total)}
          hint={t("kpiTotalHint")}
          icon={Building2}
        />
        <PlatformAdminStatCard
          label={t("kpiOnboarded")}
          value={String(onboarded)}
          hint={t("kpiOnboardedHint")}
          icon={Users}
        />
        <PlatformAdminStatCard
          label={t("kpiPending")}
          value={String(pendingOnboarding)}
          hint={t("kpiPendingHint")}
          icon={Building2}
        />
      </div>

      <DataTable
        title={t("tableTitle")}
        icon={Building2}
        columns={tableColumns}
        data={rows}
        filters={filters}
        exportOptions={{
          fileName: "platform-companies",
          title: t("title"),
          columns: [
            { id: "name", label: t("nameColumn"), value: (row) => row.name },
            { id: "slug", label: t("slugColumn"), value: (row) => row.slug },
            {
              id: "ownerEmail",
              label: t("ownerEmailColumn"),
              value: (row) => row.ownerEmail,
            },
            {
              id: "creditBalance",
              label: t("balanceColumn"),
              value: (row) => row.creditBalance ?? "0",
            },
            {
              id: "status",
              label: t("statusColumn"),
              value: (row) =>
                row.onboardingCompletedAt ? t("statusActive") : t("statusPending"),
            },
            {
              id: "createdAt",
              label: t("createdAtColumn"),
              value: (row) => formatPlatformDate(row.createdAt, locale),
            },
          ],
        }}
        emptyState={{
          icon: Building2,
          title: t("emptyTitle"),
          description: t("emptyDescription"),
          action: (
            <Button onClick={onCreateCompany}>
              <Plus className="size-4" />
              {t("createCompany")}
            </Button>
          ),
        }}
      />
    </>
  );
}
