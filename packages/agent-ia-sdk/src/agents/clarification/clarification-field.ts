import { z } from 'zod';

/**
 * Canonical clarification field contract shared by every agent that collects a
 * brief before running the LLM. Agents emit one field per pause; the resolver
 * decides what to ask next based on the answers accumulated so far.
 */
export const clarificationFieldKindZod = z.enum(['single', 'multi', 'text']);

export const clarificationOptionZod = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
});

export const clarificationFieldSchema = z.object({
  name: z.string(),
  kind: clarificationFieldKindZod,
  label: z.string(),
  description: z.string().optional(),
  options: z.array(clarificationOptionZod).optional(),
  placeholder: z.string().optional(),
  required: z.boolean().optional(),
  /** When present, the field is only asked if the predicate holds. */
  dependsOn: z
    .object({
      field: z.string(),
      equals: z.unknown(),
    })
    .optional(),
});

export type ClarificationFieldKind = z.infer<typeof clarificationFieldKindZod>;
export type ClarificationOption = z.infer<typeof clarificationOptionZod>;
export type ClarificationField = z.infer<typeof clarificationFieldSchema>;
