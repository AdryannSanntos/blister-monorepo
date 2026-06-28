import { z } from 'zod';

export const createCompanyDtoSchema = z.object({
  name: z.string().min(2).max(100),
  ownerEmail: z.string().email(),
  ownerName: z.string().min(2).max(100).optional(),
});

export type CreateCompanyDto = z.infer<typeof createCompanyDtoSchema>;
