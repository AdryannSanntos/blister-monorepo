import { z } from 'zod';
import type { ClarificationField } from '../clarification/clarification-field';

/** Step metadata carried alongside a StepResult (tokens, model, cost). */
export const stepMetadataZod = z.object({
  llmModel: z.string().optional(),
  tokensInput: z.number().optional(),
  tokensOutput: z.number().optional(),
  creditCost: z.number().optional(),
});

/** Definition of an enriched (non-form) brief field extracted by analysis. */
export const enrichmentFieldZod = z.object({
  name: z.string(),
  description: z.string(),
});

export type EnrichmentField = z.infer<typeof enrichmentFieldZod>;

/**
 * Validates a single answer against the field that asked for it. `single`
 * answers must match one of the option ids; `multi` must be a subset; `text`
 * must be a non-empty string when required.
 */
export const validateFormAnswer = (
  field: ClarificationField,
  value: unknown,
): z.ZodSafeParseResult<unknown> => {
  const optionIds = (field.options ?? []).map((option) => option.id);

  let schema: z.ZodType;
  switch (field.kind) {
    case 'single':
      schema = optionIds.length > 0 ? z.enum(optionIds as [string, ...string[]]) : z.string();
      break;
    case 'multi':
      schema =
        optionIds.length > 0
          ? z.array(z.enum(optionIds as [string, ...string[]]))
          : z.array(z.string());
      break;
    default:
      schema = field.required === false ? z.string() : z.string().min(1);
      break;
  }

  return schema.safeParse(value);
};
