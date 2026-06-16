import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceOptionDto } from "@company-os/types";
import { apiClient } from "src/core/shared/utils/api-client";

export type WorkspaceContextResponse = {
  active: {
    type: "personal" | "company";
    personalSpaceId?: string;
    companyId?: string;
    userId: string;
  };
  personal: WorkspaceOptionDto;
  companies: WorkspaceOptionDto[];
};

const workspaceKeys = {
  all: ["workspace"] as const,
  context: () => [...workspaceKeys.all, "context"] as const,
  home: () => [...workspaceKeys.all, "home-destination"] as const,
  companies: () => [...workspaceKeys.all, "companies"] as const,
};

export function useWorkspaceContext() {
  return useQuery({
    queryKey: workspaceKeys.context(),
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceContextResponse>(
        "/personal-space/context",
      );
      return data;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useHomeDestination() {
  return useQuery({
    queryKey: workspaceKeys.home(),
    queryFn: async () => {
      const { data } = await apiClient.get<{
        destination: "onboarding" | "dashboard" | "personal-space";
        companyCount: number;
        onboardedCount: number;
      }>("/companies/home-destination");
      return data;
    },
  });
}

export function useCompanies() {
  return useQuery({
    queryKey: workspaceKeys.companies(),
    queryFn: async () => {
      const { data } = await apiClient.get<
        Array<{
          id: string;
          name: string;
          slug: string;
          onboardingCompletedAt: string | null;
        }>
      >("/companies");
      return data;
    },
  });
}

export function useInvalidateWorkspace() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
  };
}
