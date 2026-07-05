"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";
import type { CarouselOutputSlide } from "@company-os/types";

export const useCarouselRender = (runId: string) => {
  const queryClient = useQueryClient();

  return useMutation<{ slides: CarouselOutputSlide[] }, Error, string[] | undefined>({
    mutationFn: async (slideIds) => {
      const { data } = await apiClient.post(`/agents/carousel/runs/${runId}/render`, {
        slideIds,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-run", runId] });
    },
    onError: () => {
      toast.error("Não foi possível processar o slide. Tente novamente.");
    },
  });
};
