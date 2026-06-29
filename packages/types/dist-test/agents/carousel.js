"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.carouselOutputSchema = exports.carouselOutputSlideSchema = exports.carouselDesignPlanSchema = exports.carouselSlideDesignSchema = exports.carouselImageSlotSchema = exports.carouselSlideContentSchema = exports.carouselIdeaOptionSchema = exports.carouselRunInputSchema = exports.carouselAgentSettingsSchema = exports.carouselBrandContextSchema = exports.carouselBrandOverridesSchema = exports.carouselMetaRightModeSchema = exports.carouselNarrativeRoleSchema = exports.carouselSlideTypeSchema = exports.carouselSocialNetworkSchema = void 0;
const zod_1 = require("zod");
exports.carouselSocialNetworkSchema = zod_1.z.enum([
    "instagram",
    "facebook",
    "tiktok",
]);
exports.carouselSlideTypeSchema = zod_1.z.enum([
    "start",
    "text",
    "text_image",
    "image",
]);
exports.carouselNarrativeRoleSchema = zod_1.z.enum([
    "hook",
    "scene",
    "proof",
    "framework",
    "cta",
]);
exports.carouselMetaRightModeSchema = zod_1.z.enum(["handle", "date"]);
exports.carouselBrandOverridesSchema = zod_1.z.object({
    brandName: zod_1.z.string().min(1).optional(),
    instagramHandle: zod_1.z
        .string()
        .regex(/^@?[\w.]+$/, "Use um @ válido do Instagram")
        .optional(),
    accentColor: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, "Use uma cor em formato #RRGGBB")
        .optional(),
});
exports.carouselBrandContextSchema = zod_1.z.object({
    brandName: zod_1.z.string(),
    instagramHandle: zod_1.z.string(),
    accentColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    metaRightMode: exports.carouselMetaRightModeSchema,
});
const emptyStringToUndefined = (value) => {
    if (typeof value !== "string")
        return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
};
exports.carouselAgentSettingsSchema = zod_1.z.object({
    slidesCount: zod_1.z.number().int().min(1).max(15).default(5),
    defaultTemplateId: zod_1.z.string().optional(),
    defaultSocialNetworks: zod_1.z
        .array(exports.carouselSocialNetworkSchema)
        .default(["instagram"]),
    aiGeneratedImages: zod_1.z.boolean().default(false),
    brandName: zod_1.z.preprocess(emptyStringToUndefined, zod_1.z.string().min(1).optional()),
    instagramHandle: zod_1.z.preprocess(emptyStringToUndefined, zod_1.z.string().regex(/^@?[\w.]+$/).optional()),
    accentColor: zod_1.z.preprocess((value) => (typeof value === "string" ? value.toUpperCase() : value), zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .default("#FF4A0A")),
    metaRightMode: exports.carouselMetaRightModeSchema.default("handle"),
});
exports.carouselRunInputSchema = zod_1.z.object({
    theme: zod_1.z.string().min(1, "Insira um tema"),
    templateId: zod_1.z.string().min(1, "Selecione um template"),
    socialNetworks: zod_1.z
        .array(exports.carouselSocialNetworkSchema)
        .min(1, "Selecione ao menos uma rede social"),
    slidesCount: zod_1.z.number().int().min(1).max(15),
    brandOverrides: exports.carouselBrandOverridesSchema.optional(),
    settings: exports.carouselAgentSettingsSchema.optional(),
});
exports.carouselIdeaOptionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
});
exports.carouselSlideContentSchema = zod_1.z.object({
    id: zod_1.z.string(),
    order: zod_1.z.number(),
    type: exports.carouselSlideTypeSchema,
    narrativeRole: exports.carouselNarrativeRoleSchema.optional(),
    title: zod_1.z.string().optional(),
    subtitle: zod_1.z.string().optional(),
    body: zod_1.z.string().optional(),
    callToAction: zod_1.z.string().optional(),
    ctaKeyword: zod_1.z.string().optional(),
    ctaHint: zod_1.z.string().optional(),
    imageBrief: zod_1.z.string().optional(),
    listItems: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.carouselImageSlotSchema = zod_1.z.object({
    /** Injectable key in slide HTML — e.g. image_url, image_url_2 */
    slotKey: zod_1.z.string().regex(/^image_url(_\d+)?$/),
    /** Human label for upload UI */
    label: zod_1.z.string(),
    required: zod_1.z.boolean().default(true),
    fileId: zod_1.z.string().optional(),
    brief: zod_1.z.string().optional(),
});
exports.carouselSlideDesignSchema = zod_1.z.object({
    id: zod_1.z.string(),
    order: zod_1.z.number(),
    type: exports.carouselSlideTypeSchema,
    variationId: zod_1.z.string(),
    layoutNotes: zod_1.z.string(),
    imageSlots: zod_1.z.array(exports.carouselImageSlotSchema).default([]),
});
exports.carouselDesignPlanSchema = zod_1.z.object({
    templateId: zod_1.z.string(),
    slides: zod_1.z.array(exports.carouselSlideDesignSchema),
});
exports.carouselOutputSlideSchema = zod_1.z.object({
    id: zod_1.z.string(),
    order: zod_1.z.number(),
    type: exports.carouselSlideTypeSchema,
    htmlContent: zod_1.z.string(),
    cssContent: zod_1.z.string(),
    pngFileId: zod_1.z.string().optional(),
});
exports.carouselOutputSchema = zod_1.z.object({
    socialNetwork: exports.carouselSocialNetworkSchema,
    templateId: zod_1.z.string(),
    slides: zod_1.z.array(exports.carouselOutputSlideSchema),
});
