import { z } from 'zod';

export const executeAgentSchema = z.strictObject({
  input: z.record(z.string(), z.unknown()).default({}),
});

export type ExecuteAgentDto = z.infer<typeof executeAgentSchema>;
