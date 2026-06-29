"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import { authClient } from "src/core/shared/utils/auth-client";

export const PLATFORM_ROLE_VALUES = [
  "platform_owner",
  "platform_admin",
] as const;

export type PlatformRole = (typeof PLATFORM_ROLE_VALUES)[number];

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

function invalidateMyPlatformRoles(
  queryClient: ReturnType<typeof useQueryClient>,
  userId?: string,
) {
  return queryClient.invalidateQueries({
    queryKey: ["platform-me-roles", userId],
  });
}

/** Current user's platform roles — safe for any authenticated user. */
export function useMyPlatformRoles() {
  const { data: session } = authClient.useSession();
  const userId = session?.user?.id;

  return useQuery<PlatformAdminAssignment[]>({
    queryKey: ["platform-me-roles", userId],
    queryFn: async () => {
      const { data } =
        await apiClient.get<PlatformAdminAssignment[]>("/platform/me/roles");
      return data;
    },
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlatformAdmins() {
  const myRoles = useMyPlatformRoles();
  const roles = (myRoles.data ?? []).map((assignment) => assignment.role);
  const canListAdmins =
    roles.includes("platform_owner") || roles.includes("platform_admin");

  return useQuery<PlatformAdminAssignment[]>({
    queryKey: ["platform-admins"],
    queryFn: async () => {
      const { data } =
        await apiClient.get<PlatformAdminAssignment[]>("/platform/admins");
      return data;
    },
    enabled: canListAdmins && !myRoles.isLoading,
  });
}

export function usePlatformRoleAccess() {
  const myRoles = useMyPlatformRoles();
  const roles = (myRoles.data ?? []).map((assignment) => assignment.role);

  return {
    isLoading: myRoles.isLoading,
    isError: myRoles.isError,
    roles,
    canAccessPlatformAdmin:
      roles.includes("platform_owner") || roles.includes("platform_admin"),
  };
}


export function usePlatformQueryEnabled(): boolean {
  const { canAccessPlatformAdmin, isLoading } = usePlatformRoleAccess();
  return !isLoading && canAccessPlatformAdmin;
}

export function useAssignPlatformRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("platformAdmin.toasts");
  const { data: session } = authClient.useSession();

  return useMutation({
    mutationFn: async (payload: { userId: string; role: PlatformRole }) => {
      const { data } = await apiClient.post<PlatformAdminAssignment>(
        `/platform/admins/${payload.userId}`,
        { role: payload.role },
      );
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        invalidatePlatformAdmins(queryClient),
        invalidateMyPlatformRoles(queryClient, session?.user?.id),
      ]);
      toast.success(t("grantSuccess"));
    },
    onError: () => {
      toast.error(t("grantError"));
    },
  });
}

export function useRemovePlatformRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("platformAdmin.toasts");
  const { data: session } = authClient.useSession();

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiClient.delete(`/platform/admins/${assignmentId}`);
    },
    onSuccess: async () => {
      await Promise.all([
        invalidatePlatformAdmins(queryClient),
        invalidateMyPlatformRoles(queryClient, session?.user?.id),
      ]);
      toast.success(t("removeSuccess"));
    },
    onError: () => {
      toast.error(t("removeError"));
    },
  });
}
