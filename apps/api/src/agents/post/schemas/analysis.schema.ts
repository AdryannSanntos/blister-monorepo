import { defineRequestAnalysisSchema } from '@company-os/agent-sdk';
import { z } from 'zod';

/**
 * Post request analysis: extends the SDK base analysis with the structured
 * fields the post agent can pull from the user's free-text request, so the
 * brief step skips questions already answered in the prompt.
 */
export const postRequestAnalysisSchema = defineRequestAnalysisSchema({
  socialNetwork: z.enum(['instagram', 'facebook', 'linkedin', 'tiktok']).optional(),
  postFormat: z.enum(['single', 'carousel']).optional(),
  slidesCount: z.number().int().min(2).max(8).optional(),
  objective: z.enum(['sell', 'engage', 'promo', 'awareness']).optional(),
});

export type PostRequestAnalysis = z.infer<typeof postRequestAnalysisSchema>;
