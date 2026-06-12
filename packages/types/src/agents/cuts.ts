import { z } from 'zod';

export const cutsAgentSettingsSchema = z
  .object({
    maxCuts: z.number().int().min(1).max(20).default(5),
    cutDurationSec: z.number().int().min(15).max(180).default(60),
    deleteSourceAfterRun: z.boolean().default(false),
    addCaptions: z.boolean().default(false),
    captionStyleId: z.string().min(1).optional(),
    autoAcceptResults: z.boolean().default(true),
  })
  .refine((data) => !data.addCaptions || Boolean(data.captionStyleId), {
    message: 'captionStyleId is required when addCaptions is true',
    path: ['captionStyleId'],
  });

export const cutReviewStatusSchema = z.enum(['pending', 'approved', 'rejected']);

export const cutOutputSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  durationSec: z.number().positive(),
  viralScore: z.number().min(0).max(100),
  reviewStatus: cutReviewStatusSchema,
  previewUrl: z.string().optional(),
});

export const cutsRunInputSchema = z.object({
  userInput: z.string().trim().min(1).max(10_000),
  sourceFileId: z.string().min(1),
  settings: cutsAgentSettingsSchema,
});

export const cutsRunOutputSchema = z.object({
  cuts: z.array(cutOutputSchema).min(1),
  sourceFileId: z.string().min(1),
  captionStyleId: z.string().optional(),
});

export const cutDecisionSchema = z.object({
  cutId: z.string().min(1),
  decision: z.enum(['approve', 'reject']),
});

export const reviewCutsSchema = z.object({
  cutDecisions: z.array(cutDecisionSchema).min(1),
});

export type CutsAgentSettings = z.infer<typeof cutsAgentSettingsSchema>;
export type CutOutput = z.infer<typeof cutOutputSchema>;
export type CutsRunInput = z.infer<typeof cutsRunInputSchema>;
export type CutsRunOutput = z.infer<typeof cutsRunOutputSchema>;
export type CutDecision = z.infer<typeof cutDecisionSchema>;
export type ReviewCutsDto = z.infer<typeof reviewCutsSchema>;
