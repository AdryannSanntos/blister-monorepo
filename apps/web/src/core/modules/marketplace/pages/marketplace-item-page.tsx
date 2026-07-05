"use client";

import { ArrowLeft, Images, Library, Store } from "lucide-react";
import { useTranslations } from "next-intl";
import { TemplateVariationGallery } from "src/core/shared/components/templates/template-variation-gallery";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { PageLayout } from "src/core/shared/components/ui/page-layout";
import { SectionCard } from "src/core/shared/components/ui/section-card";
import { Skeleton } from "src/core/shared/components/ui/skeleton";
import { useCarouselTemplates } from "src/core/shared/hooks/use-carousel-templates";
import { Link } from "@/i18n/routing";

import { MarketplacePurchasePanel } from "../components/marketplace-purchase-panel";
import { useMarketplaceItem } from "../hooks/use-marketplace";
import { getMarketplaceTypeLabelKey } from "../utils/marketplace-catalog.utils";

type MarketplaceItemPageProps = {
  itemId: string;
};

export const MarketplaceItemPage = ({ itemId }: MarketplaceItemPageProps) => {
  const t = useTranslations("marketplace");
  const { data: item, isLoading } = useMarketplaceItem(itemId);
  const { data: carouselTemplates = [] } = useCarouselTemplates();

  const templateId =
    item?.type === "template"
      ? (item.refId ?? item.specs?.templateId ?? null)
      : null;
  const templatePreview = templateId
    ? (carouselTemplates.find((entry) => entry.id === templateId) ?? null)
    : null;

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
          {templatePreview ? (
            <SectionCard
              icon={Images}
              title="Variações do template"
              description={`${templatePreview.variations.length} layouts organizados por posição da imagem e tema.`}
            >
              <TemplateVariationGallery
                variations={templatePreview.variations}
                accentColor={templatePreview.accentColor}
              />
            </SectionCard>
          ) : null}
        </div>

        <MarketplacePurchasePanel item={item} />
      </div>
    </PageLayout>
  );
};
