import { z } from 'zod';

export const lookupUserByEmailSchema = z.object({
  email: z.string().email(),
});

export type LookupUserByEmailQuery = z.infer<typeof lookupUserByEmailSchema>;
