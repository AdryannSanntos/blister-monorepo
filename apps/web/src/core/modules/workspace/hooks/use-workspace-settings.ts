"use client";

import type { DeleteCompanyDto } from "@company-os/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  const t = useTranslations("workspace.settings.toasts");

  return useMutation({
    mutationFn: async (dto: DeleteCompanyDto) => {
      await apiClient.delete("/company", { data: dto });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["company"] });
      void queryClient.invalidateQueries({ queryKey: ["companies"] });
      void queryClient.invalidateQueries({
        queryKey: ["companies", "home-destination"],
      });
      toast.success(t("deleteSuccess"));
    },
    onError: () => {
      toast.error(t("deleteError"));
    },
  });
}
