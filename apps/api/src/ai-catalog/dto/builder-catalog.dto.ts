import { z } from 'zod';

export const builderCatalogQuerySchema = z.strictObject({
  kind: z.enum(['text', 'image']).optional(),
});

export type BuilderCatalogQueryDto = z.infer<typeof builderCatalogQuerySchema>;
