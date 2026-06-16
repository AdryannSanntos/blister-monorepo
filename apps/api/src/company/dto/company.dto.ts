import { deleteCompanySchema } from '@company-os/types';
import { z } from 'zod';

export const updateCompanyBodySchema = z.object({
  name: z.string().min(2).max(120),
});

export { deleteCompanySchema };

// Onboarding mínimo: só o nome é obrigatório (empresa = nome + objetivo).
export const onboardingBodySchema = z.object({
  companyName: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  niche: z.string().max(200).optional(),
  brandVoice: z.string().max(2000).optional(),
  logoStorageKey: z.string().optional(),
  createNew: z.boolean().optional(),
});
