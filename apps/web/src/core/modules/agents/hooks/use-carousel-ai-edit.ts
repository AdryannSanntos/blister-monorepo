"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "src/core/shared/utils/api-client";

export type CarouselAiEditInput = {
  slideId: string;
  mode: "rewrite_text" | "visual_edit";
  prompt: string;
  layerId?: string;
  currentHtmlContent?: string;
  currentCssContent?: string;
};

export const useCarouselAiEdit = (runId: string) =>
  useMutation<{ htmlContent: string; cssContent: string }, Error, CarouselAiEditInput>({
    mutationFn: async (input) => {
      const { data } = await apiClient.post(`/agents/carousel/runs/${runId}/ai-edit`, input);
      return data;
    },
    onError: () => {
      toast.error("Não foi possível processar o slide. Tente novamente.");
    },
  });
