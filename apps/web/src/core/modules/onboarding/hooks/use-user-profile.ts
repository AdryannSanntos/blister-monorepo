"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  cpf: string | null;
  phone: string | null;
  onboardingCompletedAt: string | null;
  userType: string;
};

export type UpdateProfilePayload = {
  name?: string;
  cpf?: string;
  phone?: string;
};

async function fetchUserProfile(): Promise<UserProfile> {
  const { data } = await apiClient.get<UserProfile>("/users/me");
  return data;
}

async function patchUserProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
  const { data } = await apiClient.patch<UserProfile>("/users/profile", payload);
  return data;
}

export function useUserProfile() {
  return useQuery({
    queryKey: ["user", "me"],
    queryFn: fetchUserProfile,
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: patchUserProfile,
    onSuccess: (updated) => {
      queryClient.setQueryData(["user", "me"], updated);
    },
  });
}
