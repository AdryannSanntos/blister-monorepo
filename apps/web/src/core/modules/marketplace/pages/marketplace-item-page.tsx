"use client";

import { ArrowLeft, Library, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { Link } from "@/i18n/routing";

import { MarketplaceIncludesList } from "../components/marketplace-includes-list";
import { MarketplaceItemSpecsCard } from "../components/marketplace-item-specs-card";
import { MarketplacePurchasePanel } from "../components/marketplace-purchase-panel";
import { MarketplaceRelatedItems } from "../components/marketplace-related-items";
import {
  useMarketplaceItem,
  useMarketplaceItems,
} from "../hooks/use-marketplace";
import { getMarketplaceTypeLabelKey } from "../utils/marketplace-catalog.utils";

type MarketplaceItemPageProps = {
  itemId: string;
};

export const MarketplaceItemPage = ({ itemId }: MarketplaceItemPageProps) => {
  const t = useTranslations("marketplace");
  const { data: item, isLoading } = useMarketplaceItem(itemId);
  const { data: catalog = [] } = useMarketplaceItems(item?.type);

  if (isLoading) {
    return (
      <PageLayout icon={Store} title={t("loadingTitle")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Skeleton className="h-[420px] rounded-[var(--r-lg)]" />
          <Skeleton className="h-[520px] rounded-[var(--r-lg)]" />
        </div>
      </PageLayout>
    );
  }

  if (!item) {
    return (
      <PageLayout
        icon={Store}
        title={t("notFound")}
        description={t("notFoundDescription")}
      >
        <Button variant="outline" asChild>
          <Link href="/dashboard/marketplace">
            <ArrowLeft className="size-4" />
            {t("back")}
          </Link>
        </Button>
      </PageLayout>
    );
  }

  const related = catalog.filter((entry) => entry.id !== item.id).slice(0, 3);
  const typeLabel = t(getMarketplaceTypeLabelKey(item.type));

  return (
    <PageLayout
      icon={Store}
      title={item.name}
      description={
        <span className="inline-flex flex-wrap items-center gap-2">
          <span>{t("byAuthor", { author: item.author })}</span>
          <Badge variant="outline">{typeLabel}</Badge>
        </span>
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/marketplace">
              <ArrowLeft className="size-4" />
              {t("back")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/library">
              <Library className="size-4" />
              {t("openLibrary")}
            </Link>
          </Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-5">
          {item.specs && Object.keys(item.specs).length > 0 ? (
            <MarketplaceItemSpecsCard specs={item.specs} title={t("specs")} />
          ) : null}
          {item.includes && item.includes.length > 0 ? (
            <MarketplaceIncludesList
              title={t("includes")}
              items={item.includes}
            />
          ) : null}
        </div>

        <MarketplacePurchasePanel item={item} />
      </div>

      <MarketplaceRelatedItems items={related} />
    </PageLayout>
  );
};
