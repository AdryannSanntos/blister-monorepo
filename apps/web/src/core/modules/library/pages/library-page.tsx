"use client";

import { Library, PackageOpen, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { parseAsString, parseAsStringEnum, useQueryStates } from "nuqs";
import { useMemo } from "react";

import { MarketplaceCatalogGrid } from "src/core/modules/marketplace/components/marketplace-catalog-grid";
import { MarketplaceToolbar } from "src/core/modules/marketplace/components/marketplace-toolbar";
import {
  useLibraryItems,
  useMarketplaceTypes,
} from "src/core/modules/marketplace/hooks/use-marketplace-mock";
import {
  filterMarketplaceItems,
  getMarketplaceTypeLabelKey,
  type MarketplacePricingFilter,
  type MarketplaceSort,
  sortMarketplaceItems,
} from "src/core/modules/marketplace/utils/marketplace-catalog.utils";
import { Button } from "src/core/shared/components/ui/button";
import { EmptyState } from "src/core/shared/components/ui/empty-state";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Link } from "@/i18n/routing";

const LIBRARY_SKELETON_IDS = [
  "library-skeleton-a",
  "library-skeleton-b",
  "library-skeleton-c",
  "library-skeleton-d",
  "library-skeleton-e",
  "library-skeleton-f",
  "library-skeleton-g",
  "library-skeleton-h",
] as const;

const LibraryEmptyState = () => {
  const t = useTranslations("library");

  return (
    <EmptyState
      icon={PackageOpen}
      title={t("emptyTitle")}
      description={t("emptyDescription")}
      action={
        <Button asChild>
          <Link href="/dashboard/marketplace">{t("browseMarketplace")}</Link>
        </Button>
      }
    />
  );
};

export const LibraryPage = () => {
  const t = useTranslations("library");
  const tMarketplace = useTranslations("marketplace");

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
  const { data: items = [], isLoading } = useLibraryItems(filters.type);

  const typeOptions = types.map((entry) => ({
    id: entry.id,
    label:
      entry.id === "all"
        ? tMarketplace("types.all")
        : tMarketplace(getMarketplaceTypeLabelKey(entry.id)),
  }));

  const visibleItems = useMemo(() => {
    const filtered = filterMarketplaceItems(items, {
      type: filters.type,
      pricing: filters.pricing,
      search: filters.q,
    });

    return sortMarketplaceItems(filtered, filters.sort);
  }, [filters.pricing, filters.q, filters.sort, filters.type, items]);

  const hasActiveFilters =
    filters.type !== "all" ||
    filters.pricing !== "all" ||
    filters.sort !== "featured" ||
    filters.q.length > 0;

  const emptyState =
    items.length === 0 && !hasActiveFilters ? (
      <LibraryEmptyState />
    ) : undefined;

  return (
    <div data-testid="library-page">
      <PageLayout
        icon={Library}
        title={t("title")}
        description={t("description")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/dashboard/marketplace">
              <Store className="size-4" />
              {t("openMarketplace")}
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
            {LIBRARY_SKELETON_IDS.map((skeletonId) => (
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
            emptyState={emptyState}
          />
        )}
      </PageLayout>
    </div>
  );
};
