"use client";
import { Brain } from "lucide-react";
import { calculateBrandBrainProgress, getBrandBrainProgressTone } from "@company-os/types";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

import { BrandBrainForm } from "src/core/modules/brand/components/brand-brain-form";
import { useBrand } from "src/core/modules/brand/hooks/use-brand";
import { useCompany } from "src/core/modules/company/hooks/use-company";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";

export function BrandPage() {
  const { data: brand, isLoading: isLoadingBrand } = useBrand();
  const { data: company, isLoading: isLoadingCompany } = useCompany();
  const t = useTranslations("brand");

  const isLoading = isLoadingBrand || isLoadingCompany;

  const progress = useMemo(() => {
    if (!brand || !company) return null;

    return calculateBrandBrainProgress({
      companyName: company.name,
      logoStorageKey: brand.logoStorageKey,
      brandVoice: brand.brandVoice,
      niche: brand.niche,
      description: brand.description,
      targetAudience: brand.targetAudience,
      marketingObjective: brand.marketingObjective,
      socialNetworks: brand.socialNetworks ?? [],
      palette: brand.palette,
      visualStyle: brand.visualStyle,
      typography: brand.typography,
      mainProducts: brand.mainProducts,
      differentiators: brand.differentiators,
    });
  }, [brand, company]);

  const overallTone = progress
    ? getBrandBrainProgressTone(progress.overall.percent)
    : null;

  return (
    <PageLayout
      icon={Brain}
      title={t("title")}
      description={t("description")}
      actions={
        progress && overallTone ? (
          <div
            className="rounded-full px-3 py-1.5 text-[13px] font-bold tabular-nums"
            style={{
              backgroundColor: overallTone.badgeBackground,
              color: overallTone.badgeText,
            }}
          >
            {t("progress.overall", { percent: progress.overall.percent })}
          </div>
        ) : null
      }
    >
      {isLoading ? (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-full max-w-2xl rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : brand && company ? (
        <BrandBrainForm company={company} brand={brand} />
      ) : null}
    </PageLayout>
  );
}
