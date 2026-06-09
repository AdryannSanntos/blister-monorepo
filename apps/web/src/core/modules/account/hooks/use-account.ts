"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { authClient } from "src/core/shared/utils/auth-client";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const t = useTranslations("account.profile");

  return useMutation({
    mutationFn: async (opts: { name: string }) => {
      const result = await authClient.updateUser({ name: opts.name });
      if (result.error) throw new Error(result.error.message ?? t("updateError"));
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["__session"] });
      toast.success(t("updateSuccess"));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useChangePassword() {
  const t = useTranslations("account.password");

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
      if (result.error) throw new Error(result.error.message ?? t("changeError"));
      return result.data;
    },
    onSuccess: () => toast.success(t("changeSuccess")),
    onError: (err: Error) => toast.error(err.message),
  });
}
