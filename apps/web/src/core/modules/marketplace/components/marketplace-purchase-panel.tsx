"use client";

import { CheckCircle2, Coins, Library, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import { MarketplaceStyleThumb } from "src/core/shared/components/blister/marketplace-style-thumb";
import { PriceBadge } from "src/core/shared/components/blister/price-badge";
import { RedeemButton } from "src/core/shared/components/blister/redeem-button";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { Heading } from "src/core/shared/components/ui/heading";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { Link } from "@/i18n/routing";
import type { MarketplaceItemView } from "../hooks/use-marketplace-mock";

type MarketplacePurchasePanelProps = {
  item: MarketplaceItemView;
};

export const MarketplacePurchasePanel = ({
  item,
}: MarketplacePurchasePanelProps) => {
  const t = useTranslations("marketplace.detail");
  const credits = useBlisterOsStore((state) => state.credits);
  const owned = Boolean(item.owned);
  const balanceAfter = item.price > 0 ? credits - item.price : credits;
  const canAfford = item.price === 0 || credits >= item.price;

  return (
    <Card className="border-[var(--line-default)] lg:sticky lg:top-6">
      <CardContent className="flex flex-col gap-5 p-5">
        <MarketplaceStyleThumb item={item} ratio="16 / 10" showType />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <PriceBadge
              item={item}
              ownedState={
                owned
                  ? item.price === 0
                    ? "redeemed"
                    : "purchased"
                  : undefined
              }
            />
            {item.flag ? (
              <Badge variant="outline" className="uppercase">
                {item.flag}
              </Badge>
            ) : null}
          </div>
          <Heading level="h5" as="h2">
            {item.name}
          </Heading>
          <Paragraph size="p5" tone="tertiary">
            {t("byAuthor", { author: item.author })}
          </Paragraph>
        </div>

        <Paragraph size="p5" tone="secondary">
          {item.description}
        </Paragraph>

        <div className="rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-sunken)] p-4">
          <div className="flex items-center justify-between gap-3">
            <Paragraph size="p5" tone="tertiary">
              {t("yourBalance")}
            </Paragraph>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--fg-primary)]">
              <Coins className="size-4 text-[var(--accent)]" aria-hidden />
              {credits}
            </span>
          </div>
          {!owned && item.price > 0 ? (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--line-default)] pt-3">
              <Paragraph size="p5" tone="tertiary">
                {t("afterPurchase")}
              </Paragraph>
              <span
                className={
                  canAfford
                    ? "text-sm font-medium text-[var(--fg-primary)]"
                    : "text-sm font-medium text-[var(--danger)]"
                }
              >
                {balanceAfter}
              </span>
            </div>
          ) : null}
        </div>

        {owned ? (
          <div className="flex flex-col gap-3">
            <div className="inline-flex items-center gap-2 rounded-[var(--r-md)] bg-[var(--success-soft)] px-3 py-2 text-sm text-[var(--success-soft-text)]">
              <CheckCircle2 className="size-4" aria-hidden />
              {t("alreadyInLibrary")}
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/library">
                <Library className="size-4" />
                {t("openLibrary")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <RedeemButton item={item} owned={owned} className="w-full" />
            {!canAfford && item.price > 0 ? (
              <Paragraph size="p6" tone="tertiary">
                {t("insufficientCredits")}
              </Paragraph>
            ) : null}
            {item.price === 0 ? (
              <Paragraph
                size="p6"
                tone="quaternary"
                className="inline-flex items-center gap-1.5"
              >
                <Sparkles className="size-3.5" aria-hidden />
                {t("freeHint")}
              </Paragraph>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
