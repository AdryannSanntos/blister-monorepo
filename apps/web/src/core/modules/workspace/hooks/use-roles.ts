"use client";

import type {
  CreateRoleDto,
  UpdateRoleDto,
  WorkspaceRole,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

function invalidateRoles(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["workspace-roles"] }),
    queryClient.invalidateQueries({ queryKey: ["team-members"] }),
    queryClient.invalidateQueries({ queryKey: ["user-permissions"] }),
  ]);
}

export function useWorkspaceRoles() {
  return useQuery<WorkspaceRole[]>({
    queryKey: ["workspace-roles"],
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceRole[]>("/roles");
      return data;
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.permissions.toasts");

  return useMutation<WorkspaceRole, Error, CreateRoleDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<WorkspaceRole>("/roles", dto);
      return data;
    },
    onSuccess: () => {
      void invalidateRoles(queryClient);
      toast.success(t("createSuccess"));
    },
    onError: () => {
      toast.error(t("createError"));
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.permissions.toasts");

  return useMutation<
    WorkspaceRole,
    Error,
    { id: string; dto: UpdateRoleDto }
  >({
    mutationFn: async ({ id, dto }) => {
      const { data } = await apiClient.patch<WorkspaceRole>(`/roles/${id}`, dto);
      return data;
    },
    onSuccess: () => {
      void invalidateRoles(queryClient);
      toast.success(t("updateSuccess"));
    },
    onError: () => {
      toast.error(t("updateError"));
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.permissions.toasts");

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      void invalidateRoles(queryClient);
      toast.success(t("deleteSuccess"));
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });
}
