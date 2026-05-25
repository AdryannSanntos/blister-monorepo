"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import { authClient } from "src/core/shared/utils/auth-client";

export type PlatformRole = "platform_owner" | "platform_admin";

export type PlatformAdminAssignment = {
  id: string;
  userId: string;
  role: PlatformRole;
  assignedBy: string;
  assignedAt: string;
};

function invalidatePlatformAdmins(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  return queryClient.invalidateQueries({ queryKey: ["platform-admins"] });
}

export function usePlatformAdmins() {
  return useQuery<PlatformAdminAssignment[]>({
    queryKey: ["platform-admins"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<PlatformAdminAssignment[]>("/platform/admins");
      return data;
    },
  });
}

export function usePlatformRoleAccess() {
  const { data: session } = authClient.useSession();
  const admins = usePlatformAdmins();
  const roles = (admins.data ?? [])
    .filter((assignment) => assignment.userId === session?.user?.id)
    .map((assignment) => assignment.role);

  return {
    ...admins,
    roles,
    canAccessPlatformAdmin:
      roles.includes("platform_owner") || roles.includes("platform_admin"),
  };
}

export type PlatformOrganization = {
  id: string;
  name: string;
  slug: string;
};

export function usePlatformOrganizations() {
  return useQuery<PlatformOrganization[]>({
    queryKey: ["platform-organizations"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<PlatformOrganization[]>("/platform/organizations");
      return data;
    },
  });
}

export function usePlatformQueryEnabled(): boolean {
  const { canAccessPlatformAdmin, isLoading } = usePlatformRoleAccess();
  return !isLoading && canAccessPlatformAdmin;
}

export function useAssignPlatformRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { userId: string; role: PlatformRole }) => {
      const { data } = await apiClient.post<PlatformAdminAssignment>(
        `/platform/admins/${payload.userId}`,
        { role: payload.role },
      );
      return data;
    },
    onSuccess: async () => {
      await invalidatePlatformAdmins(queryClient);
      toast.success("Acesso de plataforma concedido.");
    },
    onError: () => {
      toast.error("Erro ao atribuir acesso de plataforma.");
    },
  });
}

export function useRemovePlatformRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiClient.delete(`/platform/admins/${assignmentId}`);
    },
    onSuccess: async () => {
      await invalidatePlatformAdmins(queryClient);
      toast.success("Acesso de plataforma removido.");
    },
    onError: () => {
      toast.error("Erro ao remover acesso de plataforma.");
    },
  });
}
