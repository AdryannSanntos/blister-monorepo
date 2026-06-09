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

export const postDesignPlanSchema = {
  type: 'object',
  properties: {
    creativeDirection: {
      type: 'string',
      description: 'Direção criativa geral da peça em 2-4 frases objetivas',
    },
    aestheticLanguage: {
      type: 'string',
      enum: aestheticLanguageZod.options,
    },
    compositionSystem: {
      type: 'string',
      description: 'Sistema de composição escolhido (ex: split editorial, bloco tipográfico)',
    },
    brandPresence: {
      type: 'string',
      enum: ['protagonist', 'signature', 'subtle'],
    },
    typography: {
      type: 'object',
      properties: {
        primaryFont: { type: 'string', description: 'Fonte principal — deve ser a da marca' },
        secondaryFont: { type: 'string' },
        headlineScale: { type: 'string', description: 'Escala relativa da headline' },
        bodyScale: { type: 'string' },
        rules: { type: 'string', description: 'Regras tipográficas para todos os slides' },
      },
      required: ['primaryFont', 'headlineScale', 'bodyScale', 'rules'],
    },
    colorStrategy: {
      type: 'object',
      properties: {
        backgroundType: { type: 'string', enum: backgroundTypeZod.options },
        primaryBackground: { type: 'string', description: 'Cor hex do fundo principal' },
        textColor: { type: 'string', description: 'Cor hex do texto principal' },
        accentColor: { type: 'string' },
        useGradient: {
          type: 'boolean',
          description: 'true somente se gradiente for essencial ao briefing',
        },
        gradientRationale: { type: 'string' },
      },
      required: ['backgroundType', 'primaryBackground', 'textColor', 'useGradient'],
    },
    slides: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      items: {
        type: 'object',
        properties: {
          index: { type: 'number' },
          role: { type: 'string', enum: slideRoleZod.options },
          headline: { type: 'string' },
          supportingText: { type: 'string' },
          compositionLayout: { type: 'string' },
          backgroundTreatment: { type: 'string' },
          cta: { type: 'string' },
          visualElements: { type: 'array', items: { type: 'string' } },
          safeAreaNotes: { type: 'string' },
        },
        required: [
          'index',
          'role',
          'headline',
          'compositionLayout',
          'backgroundTreatment',
          'visualElements',
        ],
      },
    },
    guardrails: {
      type: 'array',
      items: { type: 'string' },
      description: 'Restrições explícitas (ex: sem gradiente decorativo, sem fonte aleatória)',
    },
    qualityChecklist: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: [
    'creativeDirection',
    'aestheticLanguage',
    'compositionSystem',
    'brandPresence',
    'typography',
    'colorStrategy',
    'slides',
    'guardrails',
    'qualityChecklist',
  ],
};
