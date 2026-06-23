import type {
  MarketplaceItemDto,
  RedeemMarketplaceDto,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type MarketplaceItemView = MarketplaceItemDto & { owned?: boolean };

export const marketplaceKeys = {
  all: ["marketplace"] as const,
  items: (type?: string) =>
    [...marketplaceKeys.all, "items", type ?? "all"] as const,
  item: (id: string) => [...marketplaceKeys.all, "item", id] as const,
  library: (type?: string) =>
    [...marketplaceKeys.all, "library", type ?? "all"] as const,
};

export function useMarketplaceItems(type?: string) {
  return useQuery({
    queryKey: marketplaceKeys.items(type),
    queryFn: async () => {
      const { data } = await apiClient.get<MarketplaceItemDto[]>(
        "/marketplace/items",
        {
          params: type && type !== "all" ? { type } : undefined,
        },
      );
      return data;
    },
  });
}

export function useMarketplaceItem(itemId: string) {
  return useQuery({
    queryKey: marketplaceKeys.item(itemId),
    queryFn: async () => {
      const { data } = await apiClient.get<MarketplaceItemDto>(
        `/marketplace/items/${itemId}`,
      );
      return data;
    },
    enabled: Boolean(itemId),
  });
}

export function useLibraryItems(type?: string) {
  return useQuery({
    queryKey: marketplaceKeys.library(type),
    queryFn: async () => {
      const { data } = await apiClient.get<MarketplaceItemDto[]>(
        "/marketplace/entitlements",
        {
          params: type && type !== "all" ? { type } : undefined,
        },
      );
      return data;
    },
  });
}

export function useRedeemMarketplaceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RedeemMarketplaceDto) => {
      const { data } = await apiClient.post<MarketplaceItemDto>(
        "/marketplace/redeem",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });
}

export const MARKETPLACE_TYPES = [
  { id: "all", labelKey: "types.all" },
  { id: "edit-style", labelKey: "types.editStyle" },
  { id: "post-style", labelKey: "types.postStyle" },
  { id: "caption-style", labelKey: "types.captionStyle" },
  { id: "text-style", labelKey: "types.textStyle" },
  { id: "pack", labelKey: "types.pack" },
  { id: "template", labelKey: "types.template" },
  { id: "asset", labelKey: "types.asset" },
  { id: "agent", labelKey: "types.agent" },
] as const;

export function useMarketplaceTypes() {
  return MARKETPLACE_TYPES;
}
