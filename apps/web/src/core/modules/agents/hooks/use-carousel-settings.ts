"use client";

import { useCallback, useState } from "react";

import { carouselAgentSettingsSchema, type CarouselAgentSettings } from "@company-os/types";
import { CAROUSEL_TEMPLATES_FIXTURE } from "src/core/modules/blister-os/fixtures/carousel-templates.fixture";

const defaultSettings = (): CarouselAgentSettings =>
  carouselAgentSettingsSchema.parse({
    defaultTemplateId: CAROUSEL_TEMPLATES_FIXTURE[0]?.id,
  });

export const useCarouselSettings = () => {
  const [data] = useState<CarouselAgentSettings>(defaultSettings);
  return { data, isLoading: false };
};

export const useUpdateCarouselSettings = () => {
  const [isPending, setIsPending] = useState(false);

  const mutate = useCallback((_config: CarouselAgentSettings) => {
    setIsPending(true);
    // Plano 2: simula save
    setTimeout(() => setIsPending(false), 600);
  }, []);

  return { mutate, isPending };
};
