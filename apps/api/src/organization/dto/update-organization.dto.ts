import { z } from 'zod';

export const updateOrganizationSchema = z.strictObject({
  name: z.string().min(2).max(120).optional(),
  logo: z.string().url().optional(),
});

export type UpdateOrganizationDto = z.infer<typeof updateOrganizationSchema>;
