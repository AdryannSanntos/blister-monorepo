import { z } from 'zod';

export const acceptInvitationSchema = z.strictObject({
  userId: z.string().min(1, 'userId is required'),
});

export type AcceptInvitationDto = z.infer<typeof acceptInvitationSchema>;
