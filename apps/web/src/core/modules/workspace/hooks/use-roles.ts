"use client";

import type {
  CreateRoleDto,
  UpdateRoleDto,
  WorkspaceRole,
} from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { getActiveWorkspaceId } from "src/core/shared/utils/active-workspace";
import { apiClient } from "src/core/shared/utils/api-client";

function invalidateRoles(
  queryClient: ReturnType<typeof useQueryClient>,
  workspaceId: string | null,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: ["workspace-roles", workspaceId ?? "default"],
    }),
    queryClient.invalidateQueries({
      queryKey: ["team-members", workspaceId ?? "default"],
    }),
    queryClient.invalidateQueries({ queryKey: ["user-permissions"] }),
  ]);
}

export function useWorkspaceRoles() {
  const workspaceId = getActiveWorkspaceId();

  return useQuery<WorkspaceRole[]>({
    queryKey: ["workspace-roles", workspaceId ?? "default"],
    queryFn: async () => {
      const { data } = await apiClient.get<WorkspaceRole[]>("/roles");
      return data;
    },
    enabled: !!workspaceId,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  const workspaceId = getActiveWorkspaceId();
  const t = useTranslations("workspace.permissions.toasts");

  return useMutation<WorkspaceRole, Error, CreateRoleDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<WorkspaceRole>("/roles", dto);
      return data;
    },
    onSuccess: () => {
      void invalidateRoles(queryClient, workspaceId);
      toast.success(t("createSuccess"));
    },
    onError: () => {
      toast.error(t("createError"));
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  const workspaceId = getActiveWorkspaceId();
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
      void invalidateRoles(queryClient, workspaceId);
      toast.success(t("updateSuccess"));
    },
    onError: () => {
      toast.error(t("updateError"));
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  const workspaceId = getActiveWorkspaceId();
  const t = useTranslations("workspace.permissions.toasts");

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/roles/${id}`);
    },
    onSuccess: () => {
      void invalidateRoles(queryClient, workspaceId);
      toast.success(t("deleteSuccess"));
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });
}
