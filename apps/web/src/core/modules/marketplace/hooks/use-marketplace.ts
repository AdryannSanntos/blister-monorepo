import type {
  MarketplaceItemDto,
  RedeemMarketplaceDto,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const marketplaceKeys = {
  all: ["marketplace"] as const,
  items: (type?: string) =>
    [...marketplaceKeys.all, "items", type ?? "all"] as const,
  item: (id: string) => [...marketplaceKeys.all, "item", id] as const,
  library: () => [...marketplaceKeys.all, "library"] as const,
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

export function useLibraryItems() {
  return useQuery({
    queryKey: marketplaceKeys.library(),
    queryFn: async () => {
      const { data } = await apiClient.get<MarketplaceItemDto[]>(
        "/marketplace/entitlements",
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
  { id: "pack", labelKey: "types.pack" },
  { id: "template", labelKey: "types.template" },
  { id: "asset", labelKey: "types.asset" },
  { id: "agent", labelKey: "types.agent" },
] as const;

export function useMarketplaceTypes() {
  return MARKETPLACE_TYPES;
}
