import { z } from 'zod';

export const createInvitationSchema = z.strictObject({
  email: z.string().email(),
  roleId: z.string().min(1).optional(),
});

export type CreateInvitationDto = z.infer<typeof createInvitationSchema>;
