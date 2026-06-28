import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";
import { getActiveWorkspaceId } from "src/core/shared/utils/active-workspace";

export type CompanyOption = {
  id: string;
  name: string;
  slug: string;
  onboardingCompletedAt: string | null;
};

export type WorkspaceContextResponse = {
  active: {
    type: "company";
    companyId?: string;
    userId: string;
  };
  companies: CompanyOption[];
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
      const { data } = await apiClient.get<CompanyOption[]>("/companies");
      const activeId = getActiveWorkspaceId();
      const response: WorkspaceContextResponse = {
        active: {
          type: "company",
          companyId: activeId ?? undefined,
          userId: "",
        },
        companies: data,
      };
      return response;
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
        destination: "onboarding" | "dashboard";
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
      const { data } = await apiClient.get<CompanyOption[]>("/companies");
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
