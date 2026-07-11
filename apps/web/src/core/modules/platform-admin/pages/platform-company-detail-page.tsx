"use client";

import type { PlatformCompanyMember } from "@company-os/types";
import { ArrowLeft, Building2, Coins, Mail, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import {
  type ColumnDef,
  DataTable,
} from "src/core/shared/components/ui/data-table";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Link } from "@/i18n/routing";

import {
  PlatformAdminStatCard,
  formatPlatformDate,
} from "../components/platform-admin-primitives";
import { usePlatformCompanyDetail } from "../hooks/use-platform-companies-admin";

type PlatformCompanyDetailPageProps = {
  companyId: string;
};

export function PlatformCompanyDetailPage({ companyId }: PlatformCompanyDetailPageProps) {
  const locale = useLocale();
  const t = useTranslations("platformAdmin.companiesPage");
  const { data: company, isLoading, isError } = usePlatformCompanyDetail(companyId);

  const memberColumns: ColumnDef<PlatformCompanyMember>[] = useMemo(
    () => [
      {
        accessorKey: "userName",
        header: t("memberNameColumn"),
        meta: { label: t("memberNameColumn") },
        cell: ({ row }) => (
          <div>
            <p className="text-[13px] font-medium text-[var(--fg-primary)]">
              {row.original.userName}
            </p>
            <p className="text-[12px] text-[var(--fg-tertiary)]">
              {row.original.userEmail}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "roleName",
        header: t("memberRoleColumn"),
        meta: { label: t("memberRoleColumn") },
        cell: ({ row }) => (
          <Badge variant="secondary">{row.original.roleName}</Badge>
        ),
      },
      {
        accessorKey: "joinedAt",
        header: t("memberJoinedColumn"),
        meta: { label: t("memberJoinedColumn") },
        cell: ({ row }) => formatPlatformDate(row.original.joinedAt, locale),
      },
    ],
    [locale, t],
  );

  if (isLoading) {
    return (
      <PageLayout title={t("detailTitle")} icon={Building2}>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </PageLayout>
    );
  }

  if (isError || !company) {
    return (
      <PageLayout title={t("detailTitle")} icon={Building2}>
        <Card>
          <CardHeader>
            <CardTitle>{t("detailNotFoundTitle")}</CardTitle>
            <CardDescription>{t("detailNotFoundDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/admin?tab=companies">
                <ArrowLeft className="size-4" />
                {t("backToList")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  const creditBalance = company.creditBalance
    ? parseFloat(company.creditBalance).toFixed(2)
    : "0.00";

  return (
    <PageLayout
      title={company.name}
      description={t("detailDescription", { slug: company.slug })}
      icon={Building2}
      actions={
        <Button asChild variant="outline">
          <Link href="/admin?tab=companies">
            <ArrowLeft className="size-4" />
            {t("backToList")}
          </Link>
        </Button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          <PlatformAdminStatCard
            label={t("detailMembersKpi")}
            value={String(company.members.length)}
            hint={t("detailMembersHint")}
            icon={Users}
          />
          <PlatformAdminStatCard
            label={t("balanceColumn")}
            value={`US$ ${creditBalance}`}
            hint={t("detailBalanceHint")}
            icon={Coins}
          />
          <PlatformAdminStatCard
            label={t("statusColumn")}
            value={
              company.onboardingCompletedAt ? t("statusActive") : t("statusPending")
            }
            hint={formatPlatformDate(company.createdAt, locale)}
            icon={Building2}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("detailInfoTitle")}</CardTitle>
            <CardDescription>{t("detailInfoDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("nameColumn")}
              </Paragraph>
              <Paragraph size="p4" className="mt-1 font-medium">
                {company.name}
              </Paragraph>
            </div>
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("slugColumn")}
              </Paragraph>
              <Paragraph size="p4" className="mt-1 font-medium">
                {company.slug}
              </Paragraph>
            </div>
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("ownerNameLabel")}
              </Paragraph>
              <Paragraph size="p4" className="mt-1 font-medium">
                {company.ownerName}
              </Paragraph>
            </div>
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("ownerEmailColumn")}
              </Paragraph>
              <div className="mt-1 flex items-center gap-2">
                <Mail className="size-4 text-[var(--fg-tertiary)]" />
                <Paragraph size="p4">{company.ownerEmail}</Paragraph>
              </div>
            </div>
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("createdAtColumn")}
              </Paragraph>
              <Paragraph size="p4" className="mt-1">
                {formatPlatformDate(company.createdAt, locale)}
              </Paragraph>
            </div>
            <div>
              <Paragraph size="p6" tone="tertiary">
                {t("updatedAtColumn")}
              </Paragraph>
              <Paragraph size="p4" className="mt-1">
                {formatPlatformDate(company.updatedAt, locale)}
              </Paragraph>
            </div>
          </CardContent>
        </Card>

        <DataTable
          title={t("membersTableTitle")}
          icon={Users}
          columns={memberColumns}
          data={company.members}
          emptyState={{
            icon: Users,
            title: t("membersEmptyTitle"),
            description: t("membersEmptyDescription"),
          }}
        />
      </div>
    </PageLayout>
  );
}
