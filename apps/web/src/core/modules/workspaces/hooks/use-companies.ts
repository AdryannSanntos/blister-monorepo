"use client";

import type {
  CompanyListItem,
  HomeDestinationResponse,
} from "@company-os/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export function useCompanies() {
  return useQuery<CompanyListItem[]>({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data } = await apiClient.get<CompanyListItem[]>("/companies");
      return data;
    },
  });
}

export function useHomeDestination() {
  return useQuery<HomeDestinationResponse>({
    queryKey: ["companies", "home-destination"],
    queryFn: async () => {
      const { data } = await apiClient.get<HomeDestinationResponse>(
        "/companies/home-destination",
      );
      return data;
    },
  });
}

export function useInvalidateCompanies() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    queryClient.invalidateQueries({ queryKey: ["company"] });
    queryClient.invalidateQueries({ queryKey: ["company", "onboarding-status"] });
  };
}

export function useRefreshHomeRouting() {
  const invalidateCompanies = useInvalidateCompanies();

  return async () => {
    invalidateCompanies();
  };
}
