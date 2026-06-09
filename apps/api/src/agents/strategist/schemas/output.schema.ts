import { z } from 'zod';

export const topicSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  suggestedDate: z.string().optional(),
  platform: z.enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'whatsapp']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const calendarSchema = z.object({
  weeklyPosts: z.number().min(1).max(21),
  bestTimes: z.array(z.string()).min(1).max(5),
  platforms: z.array(z.string()).optional(),
});

export const strategistOutputZod = z.object({
  topics: z.array(topicSchema).min(1).max(14),
  calendar: calendarSchema,
  recommendations: z.string().min(20).max(2000),
  reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
});

export type StrategistOutput = z.infer<typeof strategistOutputZod>;

export const strategistOutputSchema = {
  type: 'object',
  properties: {
    topics: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          suggestedDate: { type: 'string' },
          platform: { type: 'string' },
          priority: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['title', 'description'],
      },
      minItems: 1,
      maxItems: 14,
    },
    calendar: {
      type: 'object',
      properties: {
        weeklyPosts: { type: 'number', minimum: 1, maximum: 21 },
        bestTimes: { type: 'array', items: { type: 'string' } },
        platforms: { type: 'array', items: { type: 'string' } },
      },
      required: ['weeklyPosts', 'bestTimes'],
    },
    recommendations: { type: 'string' },
    reviewStatus: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
  },
  required: ['topics', 'calendar', 'recommendations'],
};

export function validateStrategistOutput(output: unknown): {
  valid: boolean;
  data?: StrategistOutput;
  errors?: string[];
} {
  const result = strategistOutputZod.safeParse(output);

  if (result.success) {
    return { valid: true, data: result.data };
  }

  return {
    valid: false,
    errors: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`),
  };
}
