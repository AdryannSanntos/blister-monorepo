import { z } from 'zod';

/**
 * A single rendered slide. `html` is a self-contained HTML document (with inline
 * <style>) sized to the platform canvas, rendered in a sandboxed iframe by the
 * web app.
 */
export const postSlideZod = z.object({
  html: z.string().min(1, 'O slide precisa de HTML'),
});

export type PostSlide = z.infer<typeof postSlideZod>;

/**
 * Shape the LLM must return: the visual slides plus the caption/hashtags. The
 * platform/format/dimensions are added by the agent from the onboarding brief,
 * so the model does not control them.
 */
export const postLlmOutputZod = z.object({
  slides: z.array(postSlideZod).min(1).max(8),
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string()).max(30),
});

export type PostLlmOutput = z.infer<typeof postLlmOutputZod>;

export const postLlmOutputSchema = {
  type: 'object',
  properties: {
    slides: {
      type: 'array',
      minItems: 1,
      maxItems: 8,
      description:
        'Slides do post. Cada item tem "html": um documento HTML completo e autocontido com <style> inline, dimensionado exatamente ao tamanho do canvas.',
      items: {
        type: 'object',
        properties: {
          html: {
            type: 'string',
            description:
              'Documento HTML completo do slide (<head> com Google Fonts da empresa, <style> inline, ícones Lucide em <svg> inline). Use somente cores e imagens da marca. Sem JavaScript.',
          },
        },
        required: ['html'],
      },
    },
    caption: {
      type: 'string',
      description: 'Legenda do post no tom de voz da marca',
      maxLength: 2200,
    },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 30,
      description: 'Hashtags relevantes (sem o caractere #)',
    },
  },
  required: ['slides', 'caption', 'hashtags'],
};

/** Full agent output (LLM output + brief-derived metadata + review status). */
export const postOutputZod = z.object({
  platform: z.string(),
  format: z.enum(['single', 'carousel']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  slidesCount: z.number().int().positive(),
  slides: z.array(postSlideZod).min(1),
  caption: z.string(),
  hashtags: z.array(z.string()),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export type PostOutput = z.infer<typeof postOutputZod>;

export const postOutputSchema = {
  type: 'object',
  properties: {
    platform: { type: 'string', description: 'Rede social de destino' },
    format: { type: 'string', enum: ['single', 'carousel'] },
    width: { type: 'number', description: 'Largura do canvas em px' },
    height: { type: 'number', description: 'Altura do canvas em px' },
    slidesCount: { type: 'number', description: 'Quantidade de slides' },
    slides: postLlmOutputSchema.properties.slides,
    caption: { type: 'string', description: 'Legenda do post' },
    hashtags: {
      type: 'array',
      items: { type: 'string' },
      description: 'Hashtags relevantes',
    },
    reviewStatus: {
      type: 'string',
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
      description: 'Status de revisão',
    },
  },
  required: ['platform', 'format', 'width', 'height', 'slides', 'caption'],
};

/** Schema of the editable fields exposed in the review UI. */
export const postReviewZod = z.object({
  caption: z.string().min(1).max(2200),
  hashtags: z.array(z.string()).max(30),
});

export function validatePostOutput(output: unknown): {
  valid: boolean;
  data?: PostOutput;
  errors?: string[];
} {
  const result = postOutputZod.safeParse(output);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
