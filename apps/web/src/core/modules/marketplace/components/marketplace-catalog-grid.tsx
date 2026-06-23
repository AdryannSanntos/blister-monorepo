"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { MarketplaceItemView } from "../hooks/use-marketplace";
import {
  buildMarketplaceCatalogSections,
  getMarketplaceTypeDescriptionKey,
  getMarketplaceTypeLabelKey,
} from "../utils/marketplace-catalog.utils";
import { MarketplaceEmptyState } from "./marketplace-empty-state";
import { MarketplaceItemCard } from "./marketplace-item-card";
import { MarketplaceStyleCard } from "./marketplace-style-card";
import {
  MarketplaceSectionCarousel,
  marketplaceSectionCarouselItemClass,
  marketplaceTextStyleCarouselItemClass,
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
            <div
              key={item.id}
              className={
                section.id === "text-style"
                  ? marketplaceTextStyleCarouselItemClass
                  : marketplaceSectionCarouselItemClass
              }
            >
              {section.id === "text-style" ? (
                <MarketplaceStyleCard item={item} />
              ) : (
                <MarketplaceItemCard item={item} compact hideType />
              )}
            </div>
          ))}
        </MarketplaceSectionCarousel>
      ))}
    </div>
  );
};
