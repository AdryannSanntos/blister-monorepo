"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PlatformCompanyDetail } from "@company-os/types";
import { apiClient } from "src/core/shared/utils/api-client";

import { usePlatformQueryEnabled } from "./use-platform-admin";

export type CreateCompanyPayload = {
  name: string;
  ownerEmail: string;
  ownerName?: string;
};

export type CreateCompanyResult = {
  company: { id: string; name: string };
  owner: { id: string; email: string; name: string };
  firstAccessUrl?: string;
};

async function createCompany(data: CreateCompanyPayload) {
  const { data: result } = await apiClient.post<CreateCompanyResult>(
    "/admin/companies",
    {
      name: data.name,
      ownerEmail: data.ownerEmail,
      ...(data.ownerName ? { ownerName: data.ownerName } : {}),
    },
  );
  return result;
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform", "companies"] });
    },
  });
}

export function usePlatformCompanyDetail(companyId: string) {
  const enabled = usePlatformQueryEnabled();

  return useQuery<PlatformCompanyDetail>({
    queryKey: ["platform", "companies", companyId],
    queryFn: async () => {
      const { data } = await apiClient.get<PlatformCompanyDetail>(
        `/platform/companies/${companyId}`,
      );
      return data;
    },
    enabled: enabled && Boolean(companyId),
  });
}
