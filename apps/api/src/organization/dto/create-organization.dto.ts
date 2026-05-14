import { createCompanySchema } from '@company-os/types';
import type { z } from 'zod';

export const createOrganizationSchema = createCompanySchema;

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;
