import { createCompanySchema } from '@company-os/types';
import { z } from 'zod';

export const createOrganizationSchema = z.strictObject({
  userId: z.string().min(1, 'userId is required'),
  ...createCompanySchema.shape,
});

export const createOrganizationPayloadSchema = createCompanySchema;

export type CreateOrganizationRequestDto = z.infer<typeof createOrganizationSchema>;
export type CreateOrganizationDto = z.infer<typeof createOrganizationPayloadSchema>;
