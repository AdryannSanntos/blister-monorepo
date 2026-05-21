import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "src/core/shared/utils/api-client";

function invalidateOrganizationAccess(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string | null,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["organization-members", orgId],
    }),
    queryClient.invalidateQueries({ queryKey: ["organizations"] }),
    queryClient.invalidateQueries({ queryKey: ["ability"] }),
  ]);
}

export type OrganizationMember = {
  id: string;
  userId: string;
  organizationId: string;
  active: boolean;
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

type MembersQueryOptions = {
  enabled?: boolean;
};

export function useOrganizationMembers(
  orgId: string | null,
  options?: MembersQueryOptions,
) {
  return useQuery<OrganizationMember[]>({
    queryKey: ["organization-members", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrganizationMember[]>(
        `/organizations/${orgId}/members`,
      );
      return data;
    },
    enabled: (options?.enabled ?? true) && Boolean(orgId),
  });
}

export function useRemoveMember(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      await apiClient.delete(`/organizations/${orgId}/members/${membershipId}`);
    },
    onSuccess: async () => {
      await invalidateOrganizationAccess(queryClient, orgId);
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
    onSuccess: async () => {
      await invalidateOrganizationAccess(queryClient, orgId);
      toast.success("Cargos atualizados com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao atualizar cargos. Tente novamente.");
    },
  });
}

export function useDeactivateMember(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      await apiClient.patch(
        `/organizations/${orgId}/members/${membershipId}/deactivate`,
      );
    },
    onSuccess: async () => {
      await invalidateOrganizationAccess(queryClient, orgId);
      toast.success("Membro desativado.");
    },
    onError: () => {
      toast.error("Erro ao desativar membro. Tente novamente.");
    },
  });
}

export function useActivateMember(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (membershipId: string) => {
      await apiClient.patch(
        `/organizations/${orgId}/members/${membershipId}/activate`,
      );
    },
    onSuccess: async () => {
      await invalidateOrganizationAccess(queryClient, orgId);
      toast.success("Membro reativado.");
    },
    onError: () => {
      toast.error("Erro ao reativar membro. Tente novamente.");
    },
  });
}
