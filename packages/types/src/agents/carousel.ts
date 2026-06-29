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

export const carouselNarrativeRoleSchema = z.enum([
  "hook",
  "scene",
  "proof",
  "framework",
  "cta",
]);
export type CarouselNarrativeRole = z.infer<typeof carouselNarrativeRoleSchema>;

export const carouselMetaRightModeSchema = z.enum(["handle", "date"]);
export type CarouselMetaRightMode = z.infer<typeof carouselMetaRightModeSchema>;

export const carouselBrandOverridesSchema = z.object({
  brandName: z.string().min(1).optional(),
  instagramHandle: z
    .string()
    .regex(/^@?[\w.]+$/, "Use um @ válido do Instagram")
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor em formato #RRGGBB")
    .optional(),
});
export type CarouselBrandOverrides = z.infer<typeof carouselBrandOverridesSchema>;

export const carouselBrandContextSchema = z.object({
  brandName: z.string(),
  instagramHandle: z.string(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  metaRightMode: carouselMetaRightModeSchema,
});
export type CarouselBrandContext = z.infer<typeof carouselBrandContextSchema>;

export const carouselAgentSettingsSchema = z.object({
  slidesCount: z.number().int().min(3).max(15).default(5),
  defaultTemplateId: z.string().optional(),
  defaultSocialNetworks: z
    .array(carouselSocialNetworkSchema)
    .default(["instagram"]),
  aiGeneratedImages: z.boolean().default(false),
  brandName: z.string().min(1).optional(),
  instagramHandle: z
    .string()
    .regex(/^@?[\w.]+$/)
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#FF4A0A"),
  metaRightMode: carouselMetaRightModeSchema.default("handle"),
});
export type CarouselAgentSettings = z.infer<typeof carouselAgentSettingsSchema>;

export const carouselRunInputSchema = z.object({
  theme: z.string().min(1, "Insira um tema"),
  templateId: z.string().min(1, "Selecione um template"),
  socialNetworks: z
    .array(carouselSocialNetworkSchema)
    .min(1, "Selecione ao menos uma rede social"),
  slidesCount: z.number().int().min(3).max(15),
  brandOverrides: carouselBrandOverridesSchema.optional(),
  settings: carouselAgentSettingsSchema.optional(),
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
  narrativeRole: carouselNarrativeRoleSchema.optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  body: z.string().optional(),
  callToAction: z.string().optional(),
  ctaKeyword: z.string().optional(),
  ctaHint: z.string().optional(),
  imageBrief: z.string().optional(),
  listItems: z.array(z.string()).optional(),
});
export type CarouselSlideContent = z.infer<typeof carouselSlideContentSchema>;

export const carouselImageSlotSchema = z.object({
  /** Injectable key in slide HTML — e.g. image_url, image_url_2 */
  slotKey: z.string().regex(/^image_url(_\d+)?$/),
  /** Human label for upload UI */
  label: z.string(),
  required: z.boolean().default(true),
  fileId: z.string().optional(),
  brief: z.string().optional(),
});
export type CarouselImageSlot = z.infer<typeof carouselImageSlotSchema>;

export const carouselSlideDesignSchema = z.object({
  id: z.string(),
  order: z.number(),
  type: carouselSlideTypeSchema,
  variationId: z.string(),
  layoutNotes: z.string(),
  imageSlots: z.array(carouselImageSlotSchema).default([]),
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
