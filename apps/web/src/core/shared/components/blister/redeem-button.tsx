"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

import { useCredits } from "src/core/modules/credits/hooks/use-credits";
import type { MarketplaceItemView } from "src/core/modules/marketplace/hooks/use-marketplace";
import { useRedeemMarketplaceItem } from "src/core/modules/marketplace/hooks/use-marketplace";
import { getCreditBalance } from "src/core/modules/marketplace/utils/marketplace-catalog.utils";
import { Button } from "src/core/shared/components/ui/button";

type RedeemButtonProps = {
  item: MarketplaceItemView;
  owned?: boolean;
  className?: string;
};

export const RedeemButton = ({ item, owned = false, className }: RedeemButtonProps) => {
  const t = useTranslations("marketplace");
  const { data: creditsData } = useCredits();
  const redeemMutation = useRedeemMarketplaceItem();
  const [isLoading, setIsLoading] = useState(false);

  const isOwned = owned || item.owned;

  if (isOwned) {
    return (
      <Button variant="outline" disabled className={className}>
        {t("installed")}
      </Button>
    );
  }

  const balance = getCreditBalance(creditsData?.balance.amount);
  const canAfford = item.price === 0 || balance >= item.price;

  const handleRedeem = async () => {
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
    <Button
      className={className}
      disabled={!canAfford || isLoading || redeemMutation.isPending}
      onClick={handleRedeem}
      aria-label={t("redeemAria", { name: item.name })}
    >
      {item.price === 0 ? t("addToLibrary") : t("redeemPaid", { price: item.price })}
    </Button>
  );
};
