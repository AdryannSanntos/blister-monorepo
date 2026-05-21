import { z } from 'zod';

export const contextSourceKindSchema = z.enum(['file', 'url', 'manual']);
export type ContextSourceKind = z.infer<typeof contextSourceKindSchema>;

export const createContextSourceSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().max(2000).optional(),
    sourceKind: contextSourceKindSchema,
    sourceUrl: z.string().trim().url().optional(),
    fileName: z.string().trim().min(1).max(255).optional(),
    mimeType: z.string().trim().min(1).optional(),
    fileSize: z.number().int().positive().optional(),
    objectKey: z.string().trim().min(1).optional(),
    publicUrl: z.string().trim().url().optional(),
    tags: z.array(z.string().trim().min(1)).default([]),
    category: z.string().trim().min(1).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.sourceKind === 'url' && !value.sourceUrl) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'sourceUrl is required for URL sources', path: ['sourceUrl'] });
    }
    if (value.sourceKind === 'file' && !value.fileName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'fileName is required for file sources', path: ['fileName'] });
    }
    if (value.sourceKind === 'file' && !value.objectKey) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'objectKey is required for file sources', path: ['objectKey'] });
    }
  });

export type CreateContextSourceDto = z.infer<typeof createContextSourceSchema>;
