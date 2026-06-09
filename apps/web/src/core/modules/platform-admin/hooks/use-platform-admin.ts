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
  const t = useTranslations("platformAdmin.toasts");

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

  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiClient.delete(`/platform/admins/${assignmentId}`);
    },
    onSuccess: async () => {
      await invalidatePlatformAdmins(queryClient);
      toast.success(t("removeSuccess"));
    },
    onError: () => {
      toast.error(t("removeError"));
    },
  });
}
