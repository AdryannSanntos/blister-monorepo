"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { type MouseEvent, useState } from "react";
import { toast } from "sonner";

import { Link } from "@/i18n/routing";
import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import { Badge } from "src/core/shared/components/ui/badge";
import { Button } from "src/core/shared/components/ui/button";
import { Card, CardContent } from "src/core/shared/components/ui/card";
import { cn } from "src/core/shared/utils";

import {
  type MarketplaceItemView,
  useRedeemMarketplaceItem,
} from "../hooks/use-marketplace";
import { getCreditBalance } from "../utils/marketplace-catalog.utils";
import { TextStylePreviewFrame } from "./text-style-preview-frame";

type MarketplaceStyleCardProps = {
  item: MarketplaceItemView;
  className?: string;
};

export const MarketplaceStyleCard = ({
  item,
  className,
}: MarketplaceStyleCardProps) => {
  const t = useTranslations("marketplace");
  const tCard = useTranslations("marketplace.card");
  const redeemMutation = useRedeemMarketplaceItem();
  const { data: creditsData } = useCredits();
  const [isLoading, setIsLoading] = useState(false);

  const owned = Boolean(item.owned);
  const credits = getCreditBalance(creditsData?.balance.amount);
  const canAfford = item.price === 0 || credits >= item.price;

  const handleRedeem = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (owned || !canAfford) return;

    setIsLoading(true);
    try {
      await redeemMutation.mutateAsync({ itemId: item.id });
      toast.success(t("redeemSuccess", { name: item.name }));
    } catch {
      toast.error(t("redeemFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card
      className={cn(
        "flex h-full min-h-[17.5rem] w-full flex-col gap-0 overflow-hidden p-0",
        owned && "ring-1 ring-[color-mix(in_oklch,var(--success-600)_18%,transparent)]",
        className,
      )}
    >
      <CardContent className="flex flex-1 flex-col items-center gap-2.5 p-3">
        <Link
          href={`/dashboard/marketplace/${item.slug}`}
          className="group block shrink-0"
          aria-label={tCard("openItem", { name: item.name })}
        >
          <TextStylePreviewFrame
            previewUrl={item.previewUrl}
            palette={item.palette}
            size="md"
          />
        </Link>

        <div className="flex h-5 w-full min-w-0 items-center gap-1.5">
          <Link
            href={`/dashboard/marketplace/${item.slug}`}
            className="min-w-0 flex-1 truncate text-[13px] font-medium leading-none text-[var(--fg-primary)] hover:text-[var(--accent)]"
            title={item.name}
          >
            {item.name}
          </Link>
          {owned ? (
            <Badge
              variant="success"
              className="h-5 shrink-0 gap-0.5 px-1.5 text-[10px] whitespace-nowrap"
            >
              <Check className="size-2.5" aria-hidden />
              {t("installed")}
            </Badge>
          ) : null}
        </div>

        <Button
          type="button"
          size="sm"
          className="mt-auto h-8 w-full shrink-0 text-xs whitespace-nowrap"
          variant={owned ? "outline" : "default"}
          disabled={owned || !canAfford || isLoading || redeemMutation.isPending}
          onClick={handleRedeem}
          aria-label={t("redeemAria", { name: item.name })}
        >
          {owned
            ? t("installed")
            : item.price === 0
              ? t("addToLibrary")
              : t("redeemPaid", { price: item.price })}
        </Button>
      </CardContent>
    </Card>
  );
};
