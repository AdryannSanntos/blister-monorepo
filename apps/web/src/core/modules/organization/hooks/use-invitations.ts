import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { apiClient } from "src/core/shared/utils/api-client";

export type Invitation = {
  id: string;
  email: string;
  inviterId: string;
  organizationId: string;
  roleId: string | null;
  status: "pending" | "accepted" | "cancelled";
  expiresAt: string;
  createdAt: string;
};

export function useInvitations(orgId: string | null) {
  return useQuery<Invitation[]>({
    queryKey: ["invitations", orgId],
    queryFn: async () => {
      const { data } = await apiClient.get<Invitation[]>(
        `/organizations/${orgId}/invitations`,
      );
      return data;
    },
    enabled: Boolean(orgId),
  });
}

export function useCreateInvitation(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      inviterId: string;
      email: string;
      roleId?: string;
    }) => {
      const { data } = await apiClient.post<Invitation>(
        `/organizations/${orgId}/invitations`,
        payload,
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", orgId] });
      toast.success("Convite enviado com sucesso!");
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = error?.response?.data?.message ?? error?.message ?? "";

      if (
        message.toLowerCase().includes("already") ||
        message.toLowerCase().includes("existe") ||
        message.toLowerCase().includes("pending")
      ) {
        toast.error("Já existe um convite pendente para este email.");
      } else {
        toast.error("Erro ao enviar convite. Tente novamente.");
      }
    },
  });
}

export function useCancelInvitation(orgId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invitationId: string) => {
      await apiClient.post(
        `/organizations/${orgId}/invitations/${invitationId}/cancel`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations", orgId] });
      toast.success("Convite cancelado.");
    },
    onError: () => {
      toast.error("Erro ao cancelar convite.");
    },
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async (payload: {
      orgId: string;
      invitationId: string;
      userId: string;
    }) => {
      const { data } = await apiClient.post(
        `/organizations/${payload.orgId}/invitations/${payload.invitationId}/accept`,
        { userId: payload.userId },
      );
      return data;
    },
    onError: (err: unknown) => {
      const error = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const message = error?.response?.data?.message ?? error?.message ?? "";

      if (
        message.toLowerCase().includes("expired") ||
        message.toLowerCase().includes("expirado")
      ) {
        toast.error("Este convite expirou.");
      } else {
        toast.error("Erro ao aceitar convite.");
      }
    },
  });
}
