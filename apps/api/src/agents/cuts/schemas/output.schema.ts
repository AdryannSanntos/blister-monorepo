import { z } from 'zod';
import {
  cutOutputSchema,
  cutsRunInputSchema,
  cutsRunOutputSchema,
  reviewCutsSchema,
} from '@company-os/types';

export {
  cutsRunInputSchema as cutsInputZod,
  cutsRunOutputSchema as cutsOutputZod,
  reviewCutsSchema,
};

export { cutOutputSchema } from '@company-os/types';

/** Raw LLM output before normalization. */
export const cutsLlmCutZod = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  viralScore: z.number().min(0).max(100),
});

export const cutsLlmOutputZod = z.object({
  cuts: z.array(cutsLlmCutZod).min(1),
});

export const normalizeCut = (
  cut: z.infer<typeof cutsLlmCutZod>,
  reviewStatus: 'pending' | 'approved' | 'rejected' = 'pending',
): z.infer<typeof cutOutputSchema> => {
  const durationSec = Math.max(1, cut.endSec - cut.startSec);
  return {
    id: cut.id,
    title: cut.title,
    description: cut.description ?? '',
    startSec: cut.startSec,
    endSec: cut.endSec,
    durationSec,
    viralScore: cut.viralScore,
    reviewStatus,
  };
};

export type CutsInput = z.infer<typeof cutsRunInputSchema>;
export type CutOutput = z.infer<typeof cutOutputSchema>;
export type CutsOutput = z.infer<typeof cutsRunOutputSchema>;
