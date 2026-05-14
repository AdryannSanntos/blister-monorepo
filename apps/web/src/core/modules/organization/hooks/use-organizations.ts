import { useQuery } from "@tanstack/react-query";

import { apiClient } from "src/core/shared/utils/api-client";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

export function useUserOrganizations(userId: string | undefined) {
  return useQuery<Organization[]>({
    queryKey: ["organizations", "user", userId],
    queryFn: async () => {
      const { data } = await apiClient.get<Organization[]>(
        `/organizations/user/${userId}`,
      );
      return data;
    },
    enabled: Boolean(userId),
  });
}
