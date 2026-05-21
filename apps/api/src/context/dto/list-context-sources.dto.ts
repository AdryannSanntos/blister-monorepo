import { z } from 'zod';

export const contextPipelineStatusSchema = z.enum([
  'pending',
  'ingesting',
  'extracting',
  'review',
  'approved',
  'rejected',
  'error',
]);

export type ContextPipelineStatus = z.infer<typeof contextPipelineStatusSchema>;

export const listContextSourcesSchema = z.object({
  search: z.string().trim().optional(),
  status: contextPipelineStatusSchema.optional(),
  sourceKind: z.enum(['file', 'url', 'manual']).optional(),
  category: z.string().trim().optional(),
});

export type ListContextSourcesDto = z.infer<typeof listContextSourcesSchema>;
