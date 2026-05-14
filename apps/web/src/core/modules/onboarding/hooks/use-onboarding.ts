import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "src/core/shared/utils/api-client";

export type OnboardingDraft = {
  id?: string;
  organizationId?: string;
  currentStep: number;
  data: Record<string, unknown>;
  publishedAt: string | null;
};

export function useOnboardingDraft(orgId: string | null) {
  return useQuery<OnboardingDraft>({
    queryKey: ["onboarding", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OnboardingDraft>(
        `/organizations/${orgId}/onboarding`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useSaveOnboardingDraft(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      currentStep: number;
      data: Record<string, unknown>;
    }) => {
      const { data } = await apiClient.put<OnboardingDraft>(
        `/organizations/${orgId}/onboarding`,
        payload,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding", orgId], data);
    },
  });
}

export function usePublishOnboarding(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data } = await apiClient.post<OnboardingDraft>(
        `/organizations/${orgId}/onboarding/publish`,
        { userId },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["onboarding", orgId], data);
      queryClient.invalidateQueries({
        queryKey: ["onboarding-status", orgId],
      });
    },
  });
}

export function useOnboardingStatus(orgId: string | null) {
  return useQuery<{ published: boolean }>({
    queryKey: ["onboarding-status", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ published: boolean }>(
        `/organizations/${orgId}/onboarding/status`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}
