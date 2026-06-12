"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import type { MarketplaceItemView } from "src/core/modules/marketplace/hooks/use-marketplace-mock";
import { useRedeemMarketplaceItem } from "src/core/modules/marketplace/hooks/use-marketplace-mock";
import { Button } from "src/core/shared/components/ui/button";
import { toast } from "sonner";

type RedeemButtonProps = {
  item: MarketplaceItemView;
  owned?: boolean;
  className?: string;
};

export const RedeemButton = ({ item, owned = false, className }: RedeemButtonProps) => {
  const t = useTranslations("marketplace");
  const credits = useBlisterOsStore((state) => state.credits);
  const redeemMutation = useRedeemMarketplaceItem();
  const [isLoading, setIsLoading] = useState(false);

  if (owned || item.owned) {
    return (
      <Button variant="outline" disabled className={className}>
        {t("alreadyOwned")}
      </Button>
    );
  }

  const balance = credits;
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
      {item.price === 0 ? t("redeemFree") : t("redeemPaid", { price: item.price })}
    </Button>
  );
};
