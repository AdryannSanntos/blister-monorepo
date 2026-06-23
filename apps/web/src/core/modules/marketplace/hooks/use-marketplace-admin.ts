import type {
  AdminMarketplaceItemDto,
  SetMarketplaceItemActiveDto,
  UpdateMarketplaceItemDto,
  UpsertMarketplaceItemDto,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

import { marketplaceKeys } from "./use-marketplace";

const adminKeys = {
  all: [...marketplaceKeys.all, "admin"] as const,
  items: () => [...adminKeys.all, "items"] as const,
};

export function useAdminMarketplaceItems() {
  return useQuery({
    queryKey: adminKeys.items(),
    queryFn: async () => {
      const { data } = await apiClient.get<AdminMarketplaceItemDto[]>(
        "/marketplace/admin/items",
      );
      return data;
    },
  });
}

export function useCreateMarketplaceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertMarketplaceItemDto) => {
      const { data } = await apiClient.post<AdminMarketplaceItemDto>(
        "/marketplace/admin/items",
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateMarketplaceItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateMarketplaceItemDto;
    }) => {
      const { data } = await apiClient.patch<AdminMarketplaceItemDto>(
        `/marketplace/admin/items/${id}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useSetMarketplaceItemActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: SetMarketplaceItemActiveDto;
    }) => {
      const { data } = await apiClient.patch<AdminMarketplaceItemDto>(
        `/marketplace/admin/items/${id}/active`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: marketplaceKeys.all });
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}
