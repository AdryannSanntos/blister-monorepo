import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "src/core/shared/utils/api-client";

export type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  joinedAt?: string;
  createdAt?: string;
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

export function useRemoveMember(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      await apiClient.delete(
        `/organizations/${orgId}/members/${membershipId}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-members", orgId],
      });
      toast.success("Membro removido com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao remover membro. Tente novamente.");
    },
  });
}

export function useUpdateMemberRoles(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      membershipId,
      roleIds,
    }: {
      membershipId: string;
      roleIds: string[];
    }) => {
      await apiClient.put(
        `/organizations/${orgId}/members/${membershipId}/roles`,
        { roleIds },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-members", orgId],
      });
      toast.success("Cargos atualizados com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao atualizar cargos. Tente novamente.");
    },
  });
}
