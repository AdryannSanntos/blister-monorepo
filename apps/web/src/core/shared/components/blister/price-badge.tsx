"use client";

import type { MarketplaceItemDto } from "@company-os/types";
import { useTranslations } from "next-intl";

import { Badge } from "src/core/shared/components/ui/badge";
import { cn } from "src/core/shared/utils";

import { OwnBadge } from "./own-badge";

type PriceBadgeSize = "default" | "sm";

type PriceBadgeProps = {
  item: Pick<MarketplaceItemDto, "price">;
  owned?: boolean;
  size?: PriceBadgeSize;
};

const sizeClass: Record<PriceBadgeSize, string> = {
  default: "",
  sm: "h-5 gap-1 px-2 text-[10px] font-semibold [&>svg]:size-2.5",
};

export const PriceBadge = ({
  item,
  owned = false,
  size = "default",
}: PriceBadgeProps) => {
  const t = useTranslations("marketplace.card");

  if (owned) {
    return <OwnBadge size={size} />;
  }

  if (item.price === 0) {
    return (
      <Badge variant="accent" className={cn(sizeClass[size])}>
        {t("free")}
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={cn(sizeClass[size])}>
      {t("credits", { price: item.price })}
    </Badge>
  );
};
