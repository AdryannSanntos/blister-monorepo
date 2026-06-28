import { z } from "zod";

export const carouselSocialNetworkSchema = z.enum([
  "instagram",
  "facebook",
  "tiktok",
]);
export type CarouselSocialNetwork = z.infer<typeof carouselSocialNetworkSchema>;

export const carouselSlideTypeSchema = z.enum([
  "start",
  "text",
  "text_image",
  "image",
]);
export type CarouselSlideType = z.infer<typeof carouselSlideTypeSchema>;

export const carouselAgentSettingsSchema = z.object({
  slidesCount: z.number().int().min(3).max(15).default(5),
  defaultTemplateId: z.string().optional(),
  defaultSocialNetworks: z
    .array(carouselSocialNetworkSchema)
    .default(["instagram"]),
  aiGeneratedImages: z.boolean().default(false),
});
export type CarouselAgentSettings = z.infer<typeof carouselAgentSettingsSchema>;

export const carouselRunInputSchema = z.object({
  theme: z.string().min(1, "Insira um tema"),
  templateId: z.string().min(1, "Selecione um template"),
  socialNetworks: z
    .array(carouselSocialNetworkSchema)
    .min(1, "Selecione ao menos uma rede social"),
  slidesCount: z.number().int().min(3).max(15),
});
export type CarouselRunInput = z.infer<typeof carouselRunInputSchema>;

export const carouselIdeaOptionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
});
export type CarouselIdeaOption = z.infer<typeof carouselIdeaOptionSchema>;

export const carouselSlideContentSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  title: z.string().optional(),
  body: z.string().optional(),
  callToAction: z.string().optional(),
});
export type CarouselSlideContent = z.infer<typeof carouselSlideContentSchema>;

export const carouselSlideDesignSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  variationId: z.string(),
  needsImage: z.boolean(),
  imageSlot: z.string().optional(),
  imageFileId: z.string().optional(),
  layoutNotes: z.string(),
});
export type CarouselSlideDesign = z.infer<typeof carouselSlideDesignSchema>;

export const carouselDesignPlanSchema = z.object({
  templateId: z.string(),
  slides: z.array(carouselSlideDesignSchema),
});
export type CarouselDesignPlan = z.infer<typeof carouselDesignPlanSchema>;

export const carouselOutputSlideSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  htmlContent: z.string(),
  cssContent: z.string(),
  pngFileId: z.string().optional(),
});
export type CarouselOutputSlide = z.infer<typeof carouselOutputSlideSchema>;

export const carouselOutputSchema = z.object({
  socialNetwork: carouselSocialNetworkSchema,
  templateId: z.string(),
  slides: z.array(carouselOutputSlideSchema),
});
export type CarouselOutput = z.infer<typeof carouselOutputSchema>;
