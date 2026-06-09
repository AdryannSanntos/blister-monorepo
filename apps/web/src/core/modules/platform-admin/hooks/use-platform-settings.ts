"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  AdjustCreditDto,
  PlatformCompany,
  PlatformCreditSettings,
  RagPlatformSettings,
  UpdateCreditSettingsDto,
  UpdateRagSettingsDto,
} from "@company-os/types";

import { apiClient } from "src/core/shared/utils/api-client";

import { usePlatformQueryEnabled } from "./use-platform-admin";

export function usePlatformSettings() {
  const enabled = usePlatformQueryEnabled();

  return useQuery<{
    credits: PlatformCreditSettings | null;
    rag: RagPlatformSettings | null;
  }>({
    queryKey: ["platform", "settings"],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        credits: PlatformCreditSettings | null;
        rag: RagPlatformSettings | null;
      }>("/platform/settings");
      return data;
    },
    enabled,
  });
}

export function useUpdateCreditSettings() {
  const queryClient = useQueryClient();

  return useMutation<PlatformCreditSettings, Error, UpdateCreditSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<PlatformCreditSettings>(
        "/platform/settings/credits",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] }),
  });
}

export function useUpdateRagSettings() {
  const queryClient = useQueryClient();

  return useMutation<RagPlatformSettings, Error, UpdateRagSettingsDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.patch<RagPlatformSettings>(
        "/platform/settings/rag",
        dto,
      );
      return data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["platform", "settings"] }),
  });
}

export function usePlatformCompanies(page = 1, pageSize = 20, search?: string) {
  const enabled = usePlatformQueryEnabled();

  return useQuery<{
    items: PlatformCompany[];
    total: number;
    page: number;
    pageSize: number;
  }>({
    queryKey: ["platform", "companies", page, pageSize, search],
    queryFn: async () => {
      const { data } = await apiClient.get<{
        items: PlatformCompany[];
        total: number;
        page: number;
        pageSize: number;
      }>("/platform/companies", {
        params: {
          page,
          pageSize,
          ...(search ? { search } : {}),
        },
      });
      return data;
    },
    enabled,
  });
}

export function useAdjustCompanyCredits(companyId: string) {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, AdjustCreditDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post(
        `/platform/companies/${companyId}/credits/adjust`,
        dto,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "companies"] });
    },
  });
}
