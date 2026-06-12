"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { MarketplaceStyleThumb } from "src/core/shared/components/blister/marketplace-style-thumb";
import { PriceBadge } from "src/core/shared/components/blister/price-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "src/core/shared/components/ui/card";
import { Paragraph } from "src/core/shared/components/ui/paragraph";
import { cn } from "src/core/shared/utils";
import { Link } from "@/i18n/routing";

import type { MarketplaceItemView } from "../hooks/use-marketplace-mock";

type MarketplaceItemCardProps = {
  item: MarketplaceItemView;
  className?: string;
  compact?: boolean;
  /** Hide type chip on thumb — use when the section already groups by type. */
  hideType?: boolean;
};

const getFlagLabel = (
  flag: MarketplaceItemView["flag"],
  t: ReturnType<typeof useTranslations<"marketplace.card">>,
) => {
  if (flag === "novo") return t("flags.new");
  if (flag === "destaque") return t("flags.featured");
  return flag ?? null;
};

export const MarketplaceItemCard = ({
  item,
  className,
  compact = false,
  hideType = false,
}: MarketplaceItemCardProps) => {
  const t = useTranslations("marketplace.card");
  const owned = Boolean(item.owned);
  const ownedState = owned
    ? item.price === 0
      ? ("redeemed" as const)
      : ("purchased" as const)
    : undefined;
  const flagLabel = getFlagLabel(item.flag, t);

  return (
    <Link
      href={`/dashboard/marketplace/${item.id}`}
      className={cn("group block h-full", className)}
      aria-label={t("openItem", { name: item.name })}
    >
      <Card
        data-interactive
        className={cn(
          "h-full gap-0 overflow-hidden p-0",
          owned && "ring-1 ring-[color-mix(in_oklch,var(--success-600)_18%,transparent)]",
        )}
      >
        <MarketplaceStyleThumb
          item={item}
          showType={!hideType && !compact}
          flagLabel={hideType || compact ? flagLabel : null}
          compact={compact}
          ratio={compact ? "5 / 3" : "16 / 10"}
          className="rounded-none border-0"
        />

        <CardContent
          className={cn(
            "flex flex-1 flex-col",
            compact ? "gap-1 px-3 pb-3 pt-2.5" : "gap-2 px-4 pb-4 pt-3",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <CardTitle
              className={cn(
                "min-w-0 flex-1 font-medium leading-snug tracking-[-0.01em] text-[var(--fg-primary)]",
                compact ? "line-clamp-1 text-[13px]" : "line-clamp-2 text-[14px]",
              )}
            >
              {item.name}
            </CardTitle>
            <PriceBadge
              item={item}
              ownedState={ownedState}
              size={compact ? "sm" : "default"}
            />
          </div>

          {!compact ? (
            <CardDescription className="line-clamp-2 text-[12.5px] leading-relaxed">
              {item.description}
            </CardDescription>
          ) : null}

          <div
            className={cn(
              "flex items-center justify-between gap-2",
              !compact && "pt-0.5",
            )}
          >
            <Paragraph
              size="p6"
              tone="quaternary"
              className="min-w-0 truncate"
            >
              {t("byAuthor", { author: item.author })}
            </Paragraph>
            {!compact ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-[var(--fg-quaternary)] transition-colors duration-[var(--dur-fast)] group-hover:text-[var(--accent)]">
                {owned ? t("owned") : t("viewDetails")}
                <ArrowUpRight
                  className="size-3 transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  aria-hidden
                />
              </span>
            ) : (
              <ArrowUpRight
                className="size-3 shrink-0 text-[var(--fg-quaternary)] opacity-0 transition-all duration-[var(--dur-fast)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[var(--accent)] group-hover:opacity-100"
                aria-hidden
              />
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};
