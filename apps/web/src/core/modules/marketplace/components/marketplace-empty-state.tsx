"use client";

import { PackageOpen } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyState } from "src/core/shared/components/ui/empty-state";

export const MarketplaceEmptyState = () => {
  const t = useTranslations("marketplace.empty");

  return (
    <EmptyState
      icon={PackageOpen}
      title={t("title")}
      description={t("description")}
    />
  );
};
