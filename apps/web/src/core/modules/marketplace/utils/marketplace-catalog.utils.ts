import type { MarketplaceItemView } from "../hooks/use-marketplace-mock";

export type MarketplacePricingFilter = "all" | "free" | "paid";
export type MarketplaceSort = "featured" | "price-asc" | "price-desc" | "name";

type FilterOptions = {
  type?: string;
  pricing?: MarketplacePricingFilter;
  search?: string;
  hideOwned?: boolean;
};

export type MarketplaceCatalogSection = {
  id: string;
  items: MarketplaceItemView[];
};

export type MarketplaceCatalogStats = {
  credits: number;
  catalogTotal: number;
  freeAvailable: number;
  paidAvailable: number;
  ownedCount: number;
  featuredCount: number;
};

const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const filterMarketplaceItems = (
  items: MarketplaceItemView[],
  {
    type = "all",
    pricing = "all",
    search = "",
    hideOwned = false,
  }: FilterOptions,
) => {
  const query = normalizeSearch(search);

  return items.filter((item) => {
    if (type !== "all" && item.type !== type) return false;
    if (hideOwned && item.owned) return false;
    if (pricing === "free" && item.price !== 0) return false;
    if (pricing === "paid" && item.price === 0) return false;

    if (!query) return true;

    const haystack = normalizeSearch(
      [item.name, item.description, item.author, item.type].join(" "),
    );

    return haystack.includes(query);
  });
};

export const sortMarketplaceItems = (
  items: MarketplaceItemView[],
  sort: MarketplaceSort,
) => {
  const next = [...items];

  next.sort((left, right) => {
    if (sort === "featured") {
      const leftScore = (left.flag ? 2 : 0) + (left.owned ? -1 : 0);
      const rightScore = (right.flag ? 2 : 0) + (right.owned ? -1 : 0);
      if (leftScore !== rightScore) return rightScore - leftScore;
      return left.name.localeCompare(right.name, "pt-BR");
    }

    if (sort === "price-asc") {
      if (left.price !== right.price) return left.price - right.price;
      return left.name.localeCompare(right.name, "pt-BR");
    }

    if (sort === "price-desc") {
      if (left.price !== right.price) return right.price - left.price;
      return left.name.localeCompare(right.name, "pt-BR");
    }

    return left.name.localeCompare(right.name, "pt-BR");
  });

  return next;
};

export const buildMarketplaceCatalogStats = (
  items: MarketplaceItemView[],
  credits: number,
  ownedCount: number,
): MarketplaceCatalogStats => ({
  credits,
  catalogTotal: items.length,
  freeAvailable: items.filter((item) => item.price === 0 && !item.owned).length,
  paidAvailable: items.filter((item) => item.price > 0 && !item.owned).length,
  ownedCount,
  featuredCount: items.filter((item) => Boolean(item.flag) && !item.owned)
    .length,
});

export const MARKETPLACE_TYPE_ORDER = [
  "edit-style",
  "post-style",
  "caption-style",
  "pack",
  "template",
  "asset",
  "agent",
] as const;

export const buildMarketplaceCatalogSections = (
  items: MarketplaceItemView[],
  selectedType: string,
): MarketplaceCatalogSection[] => {
  if (selectedType !== "all") {
    return items.length > 0 ? [{ id: selectedType, items }] : [];
  }

  return MARKETPLACE_TYPE_ORDER.map((typeId) => ({
    id: typeId,
    items: items.filter((item) => item.type === typeId),
  })).filter((section) => section.items.length > 0);
};

export const getMarketplaceTypeLabelKey = (typeId: string) => {
  if (typeId === "edit-style") return "types.editStyle" as const;
  if (typeId === "post-style") return "types.postStyle" as const;
  if (typeId === "caption-style") return "types.captionStyle" as const;
  return `types.${typeId}` as
    | "types.all"
    | "types.pack"
    | "types.template"
    | "types.asset"
    | "types.agent";
};

export const getMarketplaceTypeDescriptionKey = (typeId: string) => {
  if (typeId === "edit-style") return "typeDescriptions.editStyle" as const;
  if (typeId === "post-style") return "typeDescriptions.postStyle" as const;
  if (typeId === "caption-style") return "typeDescriptions.captionStyle" as const;
  return `typeDescriptions.${typeId}` as
    | "typeDescriptions.pack"
    | "typeDescriptions.template"
    | "typeDescriptions.asset"
    | "typeDescriptions.agent";
};
