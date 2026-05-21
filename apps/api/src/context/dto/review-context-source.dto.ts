import { z } from 'zod';

export const reviewContextSourceSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  reviewNotes: z.string().trim().max(1000).optional(),
});

export type ReviewContextSourceDto = z.infer<typeof reviewContextSourceSchema>;
