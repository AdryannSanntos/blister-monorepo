import type { MarketplaceItem, OwnedState } from "src/core/modules/blister-os/types/marketplace";
import { formatMarketplacePrice } from "src/core/modules/blister-os/fixtures/marketplace-items.fixture";
import { Badge } from "src/core/shared/components/ui/badge";
import { cn } from "src/core/shared/utils";

import { OwnBadge } from "./own-badge";

type PriceBadgeSize = "default" | "sm";

type PriceBadgeProps = {
  item: MarketplaceItem;
  ownedState?: OwnedState;
  size?: PriceBadgeSize;
};

const sizeClass: Record<PriceBadgeSize, string> = {
  default: "",
  sm: "h-5 gap-1 px-2 text-[10px] font-semibold [&>svg]:size-2.5",
};

export const PriceBadge = ({
  item,
  ownedState,
  size = "default",
}: PriceBadgeProps) => {
  if (ownedState) {
    return <OwnBadge state={ownedState} size={size} />;
  }

  if (item.price === 0) {
    return (
      <Badge
        variant="accent"
        className={cn(sizeClass[size])}
      >
        Grátis
      </Badge>
    );
  }

  return (
    <Badge
      variant="warning"
      className={cn(sizeClass[size])}
    >
      {formatMarketplacePrice(item.price)}
    </Badge>
  );
};
