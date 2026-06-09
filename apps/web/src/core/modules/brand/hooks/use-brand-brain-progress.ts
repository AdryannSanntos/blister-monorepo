"use client";

import {
  calculateBrandBrainProgress,
  getBrandBrainStatusTone,
} from "@company-os/types";
import { useMemo } from "react";

import { useCompany } from "src/core/modules/company/hooks/use-company";

import { useBrand } from "./use-brand";

export function useBrandBrainProgress() {
  const { data: brand, isLoading: isBrandLoading } = useBrand();
  const { data: company, isLoading: isCompanyLoading } = useCompany();

  const progress = useMemo(() => {
    if (!brand || !company) return null;

    return calculateBrandBrainProgress({
      companyName: company.name,
      logoStorageKey: brand.logoStorageKey,
      logoVariants: brand.logoVariants,
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

  const statusTone = progress
    ? getBrandBrainStatusTone(progress.overall.percent)
    : null;

  return {
    progress,
    statusTone,
    isLoading: isBrandLoading || isCompanyLoading,
  };
}
