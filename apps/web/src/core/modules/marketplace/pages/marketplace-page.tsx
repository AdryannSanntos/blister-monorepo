"use client";

import { Library, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useMemo } from "react";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Link } from "@/i18n/routing";

import { MarketplaceCatalogGrid } from "../components/marketplace-catalog-grid";
import { MarketplaceToolbar } from "../components/marketplace-toolbar";
import {
  useMarketplaceItems,
  useMarketplaceTypes,
} from "../hooks/use-marketplace-mock";
import {
  filterMarketplaceItems,
  getMarketplaceTypeLabelKey,
  type MarketplacePricingFilter,
  type MarketplaceSort,
  sortMarketplaceItems,
} from "../utils/marketplace-catalog.utils";

const MARKETPLACE_SKELETON_IDS = [
  "marketplace-skeleton-a",
  "marketplace-skeleton-b",
  "marketplace-skeleton-c",
  "marketplace-skeleton-d",
  "marketplace-skeleton-e",
  "marketplace-skeleton-f",
  "marketplace-skeleton-g",
  "marketplace-skeleton-h",
] as const;

export const MarketplacePage = () => {
  const t = useTranslations("marketplace");

  const [filters, setFilters] = useQueryStates({
    type: parseAsString.withDefault("all"),
    pricing: parseAsStringEnum<MarketplacePricingFilter>([
      "all",
      "free",
      "paid",
    ]).withDefault("all"),
    sort: parseAsStringEnum<MarketplaceSort>([
      "featured",
      "price-asc",
      "price-desc",
      "name",
    ]).withDefault("featured"),
    q: parseAsString.withDefault(""),
  });

  const { data: types = [] } = useMarketplaceTypes();
  const { data: items = [], isLoading } = useMarketplaceItems(filters.type);

  const typeOptions = types.map((entry) => ({
    id: entry.id,
    label:
      entry.id === "all"
        ? t("types.all")
        : t(getMarketplaceTypeLabelKey(entry.id)),
  }));

  const visibleItems = useMemo(() => {
    const filtered = filterMarketplaceItems(items, {
      type: filters.type,
      pricing: filters.pricing,
      search: filters.q,
    });

    return sortMarketplaceItems(filtered, filters.sort);
  }, [filters.pricing, filters.q, filters.sort, filters.type, items]);

  return (
    <div data-testid="marketplace-page">
      <PageLayout
        icon={Store}
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/library">
              <Library className="size-4" />
              {t("openLibrary")}
            </Link>
          </Button>
        }
      >
        <MarketplaceToolbar
          type={filters.type}
          pricing={filters.pricing}
          sort={filters.sort}
          search={filters.q}
          typeOptions={typeOptions}
          onTypeChange={(value) => setFilters({ type: value })}
          onPricingChange={(value) => setFilters({ pricing: value })}
          onSortChange={(value) => setFilters({ sort: value })}
          onSearchChange={(value) => setFilters({ q: value })}
        />

        {isLoading ? (
          <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {MARKETPLACE_SKELETON_IDS.map((skeletonId) => (
              <Skeleton
                key={skeletonId}
                className="h-36 rounded-[var(--r-lg)]"
              />
            ))}
          </div>
        ) : (
          <MarketplaceCatalogGrid
            items={visibleItems}
            selectedType={filters.type}
          />
        )}
      </PageLayout>
    </div>
  );
};
