"use client";
import type {
  AddBrandAssetDto,
  BrandProfileResponse,
  UpdateBrandProfileDto,
  UpdateLogoDto,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export function useBrand() {
  return useQuery<BrandProfileResponse | null>({
    queryKey: ["brand"],
    queryFn: async () => {
      const { data } = await apiClient.get<BrandProfileResponse | null>(
        "/company/brand",
      );
      return data;
    },
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, UpdateBrandProfileDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<BrandProfileResponse>(
        "/company/brand",
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
    },
  });
}

export function useUpdateLogo() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, UpdateLogoDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<BrandProfileResponse>(
        "/company/brand/logo",
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
      queryClient.invalidateQueries({ queryKey: ["storage-image"] });
    },
  });
}

export function useAddBrandAsset() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, AddBrandAssetDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<BrandProfileResponse>(
        "/company/brand/assets",
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
      queryClient.invalidateQueries({ queryKey: ["storage-image"] });
    },
  });
}

export function useRemoveBrandAsset() {
  const queryClient = useQueryClient();
  return useMutation<BrandProfileResponse, Error, string>({
    mutationFn: async (assetId) => {
      const { data } = await apiClient.delete<BrandProfileResponse>(
        `/company/brand/assets/${assetId}`,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand"] });
      queryClient.invalidateQueries({ queryKey: ["storage-image"] });
    },
  });
}
