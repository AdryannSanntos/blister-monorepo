import { Check } from "lucide-react";

import type { OwnedState } from "src/core/modules/blister-os/types/marketplace";
import { Badge } from "src/core/shared/components/ui/badge";
import { cn } from "src/core/shared/utils";

type OwnBadgeProps = {
  state: OwnedState;
  size?: "default" | "sm";
};

const sizeClass = {
  default: "",
  sm: "h-5 gap-1 px-2 text-[10px] font-semibold [&>svg]:size-2.5",
};

export const OwnBadge = ({ state, size = "default" }: OwnBadgeProps) => (
  <Badge
    variant="success"
    className={cn(sizeClass[size])}
  >
    <Check aria-hidden />
    {state === "purchased" ? "Comprado" : "Resgatado"}
  </Badge>
);
