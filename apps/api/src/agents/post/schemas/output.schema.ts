import { defineAgentSchemas } from '@company-os/agent-sdk';
import { z } from 'zod';

export const postSlideZod = z.object({
  html: z.string().min(1, 'O slide precisa de HTML'),
});

export type PostSlide = z.infer<typeof postSlideZod>;

export const postSchemas = defineAgentSchemas({
  input: z.object({
    userInput: z.string().min(5).max(1000),
  }),
  llmOutput: z.object({
    slides: z.array(postSlideZod).min(1).max(8),
    caption: z.string().min(1).max(2200),
    hashtags: z.array(z.string()).max(30),
  }),
  output: z.object({
    platform: z.string(),
    format: z.enum(['single', 'carousel']),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    slidesCount: z.number().int().positive(),
    slides: z.array(postSlideZod).min(1),
    caption: z.string(),
    hashtags: z.array(z.string()),
    reviewStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).default('PENDING'),
  }),
  review: z.object({
    caption: z.string().min(1).max(2200),
    hashtags: z.array(z.string()).max(30),
  }),
});

export const postInputZod = postSchemas.zod.input;
export const postLlmOutputZod = postSchemas.zod.llmOutput;
export const postOutputZod = postSchemas.zod.output;
export const postReviewZod = postSchemas.zod.review;

export type PostLlmOutput = z.infer<typeof postLlmOutputZod>;
export type PostOutput = z.infer<typeof postOutputZod>;
