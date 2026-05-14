"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { authClient } from "src/core/shared/utils/auth-client";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { name: string }) => {
      const result = await authClient.updateUser({ name: opts.name });
      if (result.error) throw new Error(result.error.message ?? "Erro ao atualizar perfil.");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["__session"] });
      toast.success("Perfil atualizado com sucesso.");
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (opts: {
      currentPassword: string;
      newPassword: string;
    }) => {
      const result = await authClient.changePassword({
        currentPassword: opts.currentPassword,
        newPassword: opts.newPassword,
        revokeOtherSessions: false,
      });
      if (result.error) throw new Error(result.error.message ?? "Erro ao alterar senha.");
      return result.data;
    },
    onSuccess: () => toast.success("Senha alterada com sucesso."),
    onError: (err: Error) => toast.error(err.message),
  });
}
