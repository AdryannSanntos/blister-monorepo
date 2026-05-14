import { useQuery } from "@tanstack/react-query";

import { apiClient } from "src/core/shared/utils/api-client";

export type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  roles: Array<{
    id: string;
    roleId: string;
    role: {
      id: string;
      name: string;
    };
  }>;
};

export function useOrganizationMembers(orgId: string | null) {
  return useQuery<OrganizationMember[]>({
    queryKey: ["organization-members", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrganizationMember[]>(
        `/organizations/${orgId}/members`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}
