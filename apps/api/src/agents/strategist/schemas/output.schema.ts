import { defineAgentSchemas } from '@company-os/agent-sdk';
import { z } from 'zod';

export const topicSchema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(500),
  suggestedDate: z.string().optional(),
  platform: z
    .enum(['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'whatsapp'])
    .optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
});

export const calendarSchema = z.object({
  weeklyPosts: z.number().min(1).max(21),
  bestTimes: z.array(z.string()).min(1).max(5),
  platforms: z.array(z.string()).optional(),
});

export const strategistSchemas = defineAgentSchemas({
  input: z.object({
    userInput: z.string().min(5).max(2000),
  }),
  llmOutput: z.object({
    topics: z.array(topicSchema).min(1).max(14),
    calendar: calendarSchema,
    recommendations: z.string().min(20).max(2000),
  }),
  output: z.object({
    topics: z.array(topicSchema).min(1).max(14),
    calendar: calendarSchema,
    recommendations: z.string().min(20).max(2000),
    reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  }),
});

export const strategistInputZod = strategistSchemas.zod.input;
export const strategistLlmOutputZod = strategistSchemas.zod.llmOutput;
export const strategistOutputZod = strategistSchemas.zod.output;

export type StrategistOutput = z.infer<typeof strategistOutputZod>;
