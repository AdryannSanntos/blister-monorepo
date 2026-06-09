"use client";

import type { InviteMemberDto, TeamMember } from "@company-os/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

function invalidateTeam(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ["team-members"] }),
    queryClient.invalidateQueries({ queryKey: ["workspace-roles"] }),
    queryClient.invalidateQueries({ queryKey: ["user-permissions"] }),
  ]);
}

export function useTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: ["team-members"],
    queryFn: async () => {
      const { data } = await apiClient.get<TeamMember[]>("/members");
      return data;
    },
  });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.team.toasts");

  return useMutation<TeamMember | undefined, Error, InviteMemberDto>({
    mutationFn: async (dto) => {
      const { data } = await apiClient.post<TeamMember | undefined>(
        "/members/invite",
        dto,
      );
      return data;
    },
    onSuccess: () => {
      void invalidateTeam(queryClient);
      toast.success(t("inviteSuccess"));
    },
    onError: () => {
      toast.error(t("inviteError"));
    },
  });
}

export function useAssignMemberRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.team.toasts");

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      await apiClient.post(`/members/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      void invalidateTeam(queryClient);
      toast.success(t("roleAssigned"));
    },
    onError: () => {
      toast.error(t("roleAssignError"));
    },
  });
}

export function useRemoveMemberRole() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.team.toasts");

  return useMutation({
    mutationFn: async ({
      userId,
      roleId,
    }: {
      userId: string;
      roleId: string;
    }) => {
      await apiClient.delete(`/members/${userId}/roles/${roleId}`);
    },
    onSuccess: () => {
      void invalidateTeam(queryClient);
      toast.success(t("roleRemoved"));
    },
    onError: () => {
      toast.error(t("roleRemoveError"));
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.team.toasts");

  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/members/${userId}`);
    },
    onSuccess: () => {
      void invalidateTeam(queryClient);
      toast.success(t("memberRemoved"));
    },
    onError: () => {
      toast.error(t("memberRemoveError"));
    },
  });
}
