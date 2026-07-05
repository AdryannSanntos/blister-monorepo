"use client";

import {
  type CarouselTemplatePreview,
  carouselTemplatesResponseSchema,
} from "@company-os/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CAROUSEL_AGENT_ID = "carousel";

export type CarouselTemplateDto = CarouselTemplatePreview;

export const carouselTemplatesQueryKey = ["carousel-templates"] as const;

export const useCarouselTemplates = () =>
  useQuery({
    queryKey: carouselTemplatesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<unknown>(
        `/agents/${CAROUSEL_AGENT_ID}/templates`,
      );
      return carouselTemplatesResponseSchema.parse(data).templates;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
