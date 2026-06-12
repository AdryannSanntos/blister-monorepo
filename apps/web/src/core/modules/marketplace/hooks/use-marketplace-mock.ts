"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  MARKETPLACE_ITEMS,
  MARKETPLACE_TYPES,
} from "src/core/modules/blister-os/fixtures/marketplace-items.fixture";
import { useBlisterOsStore } from "src/core/modules/blister-os/stores/blister-os-store";
import type { MarketplaceItem } from "src/core/modules/blister-os/types/marketplace";
import { simulateDelay } from "src/core/modules/blister-os/utils/simulate-delay";

export { MARKETPLACE_TYPES };

const marketplaceKeys = {
  all: ["marketplace-mock"] as const,
  list: (type: string) => [...marketplaceKeys.all, "list", type] as const,
  detail: (id: string) => [...marketplaceKeys.all, "detail", id] as const,
};

export const useMarketplaceTypes = () =>
  useQuery({
    queryKey: [...marketplaceKeys.all, "types"],
    queryFn: () => MARKETPLACE_TYPES,
  });

export const useMarketplaceItems = (type = "all") => {
  const owned = useBlisterOsStore((state) => state.owned);

  return useQuery({
    queryKey: [...marketplaceKeys.list(type), owned],
    queryFn: () => {
      const items =
        type === "all"
          ? MARKETPLACE_ITEMS
          : MARKETPLACE_ITEMS.filter((item) => item.type === type);

      return items.map((item) => toMarketplaceItemView(item, owned));
    },
  });
};

export type MarketplaceItemView = MarketplaceItem & { owned: boolean };

const toMarketplaceItemView = (
  item: MarketplaceItem,
  ownedMap: Record<string, unknown>,
): MarketplaceItemView => ({
  ...item,
  owned: Boolean(ownedMap[item.id]),
});

export const useMarketplaceItem = (itemId: string) => {
  const owned = useBlisterOsStore((state) => state.owned);

  return useQuery({
    queryKey: [...marketplaceKeys.detail(itemId), owned],
    queryFn: async () => {
      await simulateDelay(200);
      const item = MARKETPLACE_ITEMS.find((entry) => entry.id === itemId);
      return item ? toMarketplaceItemView(item, owned) : null;
    },
  });
};

export const useRedeemMarketplaceItem = () => {
  const redeemItem = useBlisterOsStore((state) => state.redeemItem);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId }: { itemId: string }) => {
      await simulateDelay(400);
      const item = MARKETPLACE_ITEMS.find((entry) => entry.id === itemId);
      if (!item) throw new Error("Item not found");

      const redeemed = redeemItem(item.id, item.price, item.agentId);
      if (!redeemed) throw new Error("Redeem failed");

      return toMarketplaceItemView(item, { [item.id]: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
    },
  });
};

export const useLibraryItems = (type = "all") => {
  const owned = useBlisterOsStore((state) => state.owned);

  return useQuery({
    queryKey: [...marketplaceKeys.all, "library", type, owned],
    queryFn: () => {
      const ownedIds = new Set(Object.keys(owned));
      return MARKETPLACE_ITEMS.filter(
        (item) =>
          ownedIds.has(item.id) && (type === "all" || item.type === type),
      ).map((item) => toMarketplaceItemView(item, owned));
    },
  });
};
