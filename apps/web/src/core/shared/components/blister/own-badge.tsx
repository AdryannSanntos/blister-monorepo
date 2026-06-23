"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "src/core/shared/components/ui/badge";
import { cn } from "src/core/shared/utils";

type OwnBadgeProps = {
  size?: "default" | "sm";
};

const sizeClass = {
  default: "",
  sm: "h-5 gap-1 px-2 text-[10px] font-semibold [&>svg]:size-2.5",
};

export const OwnBadge = ({ size = "default" }: OwnBadgeProps) => {
  const t = useTranslations("marketplace");

  return (
    <Badge variant="success" className={cn(sizeClass[size])}>
      <Check aria-hidden />
      {t("installed")}
    </Badge>
  );
};
