import { z } from 'zod';

const backgroundTypeZod = z.enum([
  'solid',
  'subtle_texture',
  'photo_overlay',
  'editorial_clean',
  'geometric_pattern',
]);

const aestheticLanguageZod = z.enum([
  'minimalista',
  'editorial',
  'bold',
  'premium',
  'tech',
  'institucional',
  'vibrante',
  'clean',
  'geometrica',
  'tipografica',
  'comercial',
  'contemporanea',
]);

const slideRoleZod = z.enum(['cover', 'content', 'proof', 'cta', 'closing']);

export const postSlidePlanZod = z.object({
  index: z.number().int().positive(),
  role: slideRoleZod,
  headline: z.string().min(1).max(200),
  supportingText: z.string().max(500).optional(),
  compositionLayout: z.string().min(1).max(300),
  backgroundTreatment: z.string().min(1).max(300),
  cta: z.string().max(120).optional(),
  visualElements: z.array(z.string().max(120)).max(8),
  safeAreaNotes: z.string().max(300).optional(),
});

export const postDesignPlanZod = z.object({
  creativeDirection: z.string().min(1).max(800),
  brandVisualStyle: z.string().min(1).max(500),
  aestheticLanguage: aestheticLanguageZod,
  compositionSystem: z.string().min(1).max(400),
  brandPresence: z.enum(['protagonist', 'signature', 'subtle']),
  typography: z.object({
    primaryFont: z.string().min(1).max(120),
    secondaryFont: z.string().max(120).optional(),
    headlineScale: z.string().max(120),
    bodyScale: z.string().max(120),
    rules: z.string().min(1).max(500),
  }),
  colorStrategy: z.object({
    backgroundType: backgroundTypeZod,
    primaryBackground: z.string().min(1).max(40),
    textColor: z.string().min(1).max(40),
    accentColor: z.string().max(40).optional(),
    useGradient: z.boolean(),
    gradientRationale: z.string().max(300).optional(),
  }),
  slides: z.array(postSlidePlanZod).min(1).max(8),
  guardrails: z.array(z.string().max(200)).min(3).max(12),
  qualityChecklist: z.array(z.string().max(200)).min(4).max(12),
});

export type PostDesignPlan = z.infer<typeof postDesignPlanZod>;
export type PostSlidePlan = z.infer<typeof postSlidePlanZod>;
