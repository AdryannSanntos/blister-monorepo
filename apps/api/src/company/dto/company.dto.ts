import { deleteCompanySchema } from '@company-os/types';
import { z } from 'zod';

export const updateCompanyBodySchema = z.object({
  name: z.string().min(2).max(120),
});

export { deleteCompanySchema };

export const onboardingBodySchema = z.object({
  companyName: z.string().min(2).max(120),
  niche: z.string().min(2).max(200),
  description: z.string().min(10).max(500),
  brandVoice: z.string().min(10).max(2000),
  logoStorageKey: z.string().optional(),
  createNew: z.boolean().optional(),
});
