"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { BlisterChipRow } from "src/core/shared/components/blister/blister-chip-row";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "src/core/shared/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/core/shared/components/ui/select";

import {
  getMarketplaceTypeLabelKey,
  type MarketplacePricingFilter,
  type MarketplaceSort,
} from "../utils/marketplace-catalog.utils";

type MarketplaceToolbarProps = {
  type: string;
  pricing: MarketplacePricingFilter;
  sort: MarketplaceSort;
  search: string;
  typeOptions: Array<{ id: string; label: string }>;
  onTypeChange: (value: string) => void;
  onPricingChange: (value: MarketplacePricingFilter) => void;
  onSortChange: (value: MarketplaceSort) => void;
  onSearchChange: (value: string) => void;
};

export const MarketplaceToolbar = ({
  type,
  pricing,
  sort,
  search,
  typeOptions,
  onTypeChange,
  onPricingChange,
  onSortChange,
  onSearchChange,
}: MarketplaceToolbarProps) => {
  const t = useTranslations("marketplace");

  const pricingOptions: Array<{ id: MarketplacePricingFilter; label: string }> =
    [
      { id: "all", label: t("pricing.all") },
      { id: "free", label: t("pricing.free") },
      { id: "paid", label: t("pricing.paid") },
    ];

  return (
    <div className="flex flex-col gap-4 rounded-[var(--r-lg)] border border-[var(--line-default)] bg-[var(--bg-base)] p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <InputGroup className="min-w-0 flex-1 border-[var(--line-default)] bg-[var(--bg-base)]">
          <InputGroupAddon align="inline-start">
            <Search className="text-[var(--fg-quaternary)]" aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAria")}
          />
        </InputGroup>

        <div className="w-full lg:w-[220px]">
          <Select
            value={sort}
            onValueChange={(value) => onSortChange(value as MarketplaceSort)}
          >
            <SelectTrigger aria-label={t("sortAria")}>
              <SelectValue placeholder={t("sort.featured")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="featured">{t("sort.featured")}</SelectItem>
              <SelectItem value="price-asc">{t("sort.priceAsc")}</SelectItem>
              <SelectItem value="price-desc">{t("sort.priceDesc")}</SelectItem>
              <SelectItem value="name">{t("sort.name")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <BlisterChipRow
          ariaLabel={t("pricingAria")}
          value={pricing}
          onChange={(value) =>
            onPricingChange(value as MarketplacePricingFilter)
          }
          options={pricingOptions}
        />
        <BlisterChipRow
          ariaLabel={t("filterAria")}
          value={type}
          onChange={onTypeChange}
          options={typeOptions.map((entry) => ({
            id: entry.id,
            label:
              entry.id === "all"
                ? entry.label
                : t(getMarketplaceTypeLabelKey(entry.id)),
          }))}
        />
      </div>
    </div>
  );
};
