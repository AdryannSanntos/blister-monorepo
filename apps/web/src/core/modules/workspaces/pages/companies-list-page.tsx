"use client";

import { Building2, ChevronRight, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useCompanies, useHomeDestination } from "src/core/modules/workspaces/hooks/use-companies";
import { Button } from "src/core/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { setActiveCompanyId } from "src/core/shared/utils/active-company";

import { Link, useRouter } from "@/i18n/routing";

export function CompaniesListPage() {
  const router = useRouter();
  const t = useTranslations("workspacesHub");
  const companies = useCompanies();
  const homeDestination = useHomeDestination();

  const onboardedCompanies =
    companies.data?.filter((company) => company.onboardingCompletedAt) ?? [];

  useEffect(() => {
    if (homeDestination.isLoading || companies.isLoading) return;

    if (homeDestination.data?.destination === "onboarding") {
      router.replace("/onboarding");
    }
  }, [
    companies.isLoading,
    homeDestination.data?.destination,
    homeDestination.isLoading,
    router,
  ]);

  const handleSelectCompany = (companyId: string) => {
    setActiveCompanyId(companyId);
    router.push("/dashboard");
  };

  if (companies.isLoading || homeDestination.isLoading) {
    return (
      <PageLayout
        icon={Building2}
        title={t("companies")}
        description={t("companiesDescription")}
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      icon={Building2}
      title={t("companies")}
      description={t("companiesDescription")}
      actions={
        <Button asChild>
          <Link href="/onboarding?new=1">
            <Plus className="size-4" />
            {t("newCompany")}
          </Link>
        </Button>
      }
    >

      {onboardedCompanies.length === 0 ? (
        <Card className="bg-[var(--bg-base)]">
          <CardHeader>
            <CardTitle>{t("emptyTitle")}</CardTitle>
            <CardDescription>{t("emptyDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/onboarding">{t("createFirstCompany")}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {onboardedCompanies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => handleSelectCompany(company.id)}
              className="group rounded-xl border border-[var(--line-subtle)] bg-[var(--bg-base)] p-5 text-left transition-all hover:border-[var(--line-default)] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              aria-label={t("openCompany", { name: company.name })}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-[var(--r-md)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-2">
                    <Building2 className="size-4 text-[var(--fg-secondary)]" />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-[var(--fg-primary)]">
                      {company.name}
                    </p>
                    <p className="text-[12px] text-[var(--fg-tertiary)]">
                      {company.slug}
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-[var(--fg-quaternary)] transition-transform group-hover:translate-x-0.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </PageLayout>
  );
}
