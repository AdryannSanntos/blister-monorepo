"use client";

import { Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { CompanyDangerZone } from "src/core/modules/workspace/components/company-danger-zone";
import { CompanyGeneralForm } from "src/core/modules/workspace/components/company-general-form";
import { useCompany } from "src/core/modules/company/hooks/use-company";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

export function WorkspaceSettingsPage() {
  const { data: company, isLoading } = useCompany();
  const t = useTranslations("workspace.settings");

  return (
    <PageLayout
      icon={Settings}
      title={t("title")}
      description={t("description")}
    >
      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      ) : company ? (
        <div className="flex flex-col gap-6">
          <CompanyGeneralForm company={company} />
          <CompanyDangerZone company={company} />
        </div>
      ) : null}
    </PageLayout>
  );
}
