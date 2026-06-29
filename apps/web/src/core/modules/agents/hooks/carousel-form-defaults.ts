import {
  carouselAgentSettingsSchema,
  type CarouselAgentSettings,
  type CarouselRunInput,
} from "@company-os/types";

export const buildCarouselFormDefaults = (
  settings?: CarouselAgentSettings,
  templates: Array<{ id: string }> = [],
): CarouselRunInput => {
  const parsed = carouselAgentSettingsSchema.parse(settings ?? {});

  return {
    theme: "",
    templateId: parsed.defaultTemplateId ?? templates[0]?.id ?? "editorial-performance",
    socialNetworks: parsed.defaultSocialNetworks.length
      ? [...parsed.defaultSocialNetworks]
      : ["instagram"],
    slidesCount: parsed.slidesCount ?? 5,
    brandOverrides: {
      brandName: parsed.brandName,
      instagramHandle: parsed.instagramHandle?.replace(/^@/, ""),
      accentColor: parsed.accentColor ?? "#FF4A0A",
    },
  };
};
