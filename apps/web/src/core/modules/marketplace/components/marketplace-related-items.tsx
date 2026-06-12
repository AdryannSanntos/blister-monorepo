"use client";

import { useTranslations } from "next-intl";

import type { MarketplaceItemView } from "../hooks/use-marketplace-mock";
import { MarketplaceItemCard } from "./marketplace-item-card";
import { MarketplaceSection } from "./marketplace-section";

type MarketplaceRelatedItemsProps = {
  items: MarketplaceItemView[];
};

export const MarketplaceRelatedItems = ({
  items,
}: MarketplaceRelatedItemsProps) => {
  const t = useTranslations("marketplace");

  if (items.length === 0) return null;

  return (
    <MarketplaceSection
      title={t("related")}
      description={t("relatedDescription")}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <MarketplaceItemCard key={item.id} item={item} hideType />
        ))}
      </div>
    </MarketplaceSection>
  );
};
