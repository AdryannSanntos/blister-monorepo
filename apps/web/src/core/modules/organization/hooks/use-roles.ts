import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { type AppPermissionKey } from "@company-os/authz";
import { apiClient } from "src/core/shared/utils/api-client";

export type OrgRole = {
  id: string;
  name: string;
  organizationId: string | null;
  isSystem: boolean;
  permissions: AppPermissionKey[];
  memberCount?: number;
};

export function useOrganizationRoles(orgId: string | null) {
  return useQuery<OrgRole[]>({
    queryKey: ["organization-roles", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<OrgRole[]>(
        `/organizations/${orgId}/roles`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useCreateRole(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      permissions: AppPermissionKey[];
    }) => {
      const { data } = await apiClient.post<OrgRole>(
        `/organizations/${orgId}/roles`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-roles", orgId],
      });
      toast.success("Cargo criado com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao criar cargo. Tente novamente.");
    },
  });
}

export function useUpdateRole(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      roleId,
      ...payload
    }: {
      roleId: string;
      name: string;
      permissions: AppPermissionKey[];
    }) => {
      const { data } = await apiClient.put<OrgRole>(
        `/organizations/${orgId}/roles/${roleId}`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-roles", orgId],
      });
      toast.success("Cargo atualizado com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao atualizar cargo. Tente novamente.");
    },
  });
}

export function useDeleteRole(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (roleId: string) => {
      await apiClient.delete(`/organizations/${orgId}/roles/${roleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["organization-roles", orgId],
      });
      toast.success("Cargo excluído com sucesso.");
    },
    onError: () => {
      toast.error("Erro ao excluir cargo. Tente novamente.");
    },
  });
}
