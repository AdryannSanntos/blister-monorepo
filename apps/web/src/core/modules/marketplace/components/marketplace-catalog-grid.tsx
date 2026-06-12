"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { MarketplaceItemView } from "../hooks/use-marketplace-mock";
import {
  buildMarketplaceCatalogSections,
  getMarketplaceTypeDescriptionKey,
  getMarketplaceTypeLabelKey,
} from "../utils/marketplace-catalog.utils";
import { MarketplaceEmptyState } from "./marketplace-empty-state";
import { MarketplaceItemCard } from "./marketplace-item-card";
import {
  MarketplaceSectionCarousel,
  marketplaceSectionCarouselItemClass,
} from "./marketplace-section-carousel";

type MarketplaceCatalogGridProps = {
  items: MarketplaceItemView[];
  selectedType: string;
  emptyState?: ReactNode;
};

export const MarketplaceCatalogGrid = ({
  items,
  selectedType,
  emptyState,
}: MarketplaceCatalogGridProps) => {
  const t = useTranslations("marketplace");

  if (items.length === 0) {
    return emptyState ?? <MarketplaceEmptyState />;
  }

  const sections = buildMarketplaceCatalogSections(items, selectedType);

  return (
    <div className="flex flex-col gap-8">
      {sections.map((section) => (
        <MarketplaceSectionCarousel
          key={`${section.id}-${section.items.length}`}
          title={t(getMarketplaceTypeLabelKey(section.id))}
          description={t(getMarketplaceTypeDescriptionKey(section.id))}
          itemCount={section.items.length}
        >
          {section.items.map((item) => (
            <div key={item.id} className={marketplaceSectionCarouselItemClass}>
              <MarketplaceItemCard item={item} compact hideType />
            </div>
          ))}
        </MarketplaceSectionCarousel>
      ))}
    </div>
  );
};
