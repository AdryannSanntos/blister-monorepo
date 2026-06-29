"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "src/core/shared/utils/api-client";

const CAROUSEL_AGENT_ID = "carousel";

export type CarouselTemplateDto = {
  id: string;
  name: string;
  description: string;
  owned?: boolean;
};

type TemplatesResponse = {
  templates: CarouselTemplateDto[];
};

export const carouselTemplatesQueryKey = ["carousel-templates"] as const;

export const useCarouselTemplates = () =>
  useQuery({
    queryKey: carouselTemplatesQueryKey,
    queryFn: async () => {
      const { data } = await apiClient.get<TemplatesResponse>(
        `/agents/${CAROUSEL_AGENT_ID}/templates`,
      );
      return data.templates;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
