import { z } from 'zod';

export const updateDesignIdentitySchema = z
  .object({
    brandEssence: z.string().trim().optional().nullable(),
    desiredPerception: z.string().trim().optional().nullable(),
    visualStyle: z.string().trim().optional().nullable(),
    antiPatterns: z.string().trim().optional().nullable(),
    conceptualReferences: z.string().trim().optional().nullable(),
    aiNotes: z.string().trim().optional().nullable(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field must be provided',
  });

export type UpdateDesignIdentityDto = z.infer<typeof updateDesignIdentitySchema>;
