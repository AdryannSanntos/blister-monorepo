import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});

const formFieldSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(160),
  type: z.enum(['text', 'textarea', 'select', 'number', 'boolean']),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
});

export const questionFormBlockSchema = z.strictObject({
  id: z.string().min(1),
  type: z.literal('question_form'),
  fields: z.array(formFieldSchema).min(1),
  includeOtherResponse: z.literal(true),
});

export const htmlValidationBlockSchema = z.strictObject({
  id: z.string().min(1),
  type: z.literal('html_validation'),
  htmlField: z.string().min(1).default('html'),
  requireExplicitConfirmation: z.literal(true).default(true),
});

export const agentFlowNodeSchema = z.discriminatedUnion('type', [
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('input'),
    config: jsonObjectSchema.optional(),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('llm_generate'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('image_generate'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('output'),
    config: jsonObjectSchema.optional(),
  }),
  questionFormBlockSchema.extend({ config: jsonObjectSchema.optional() }),
  htmlValidationBlockSchema.extend({ config: jsonObjectSchema.optional() }),
]);

export const agentFlowDefinitionSchema = z.strictObject({
  nodes: z.array(agentFlowNodeSchema).default([]),
  config: jsonObjectSchema.optional(),
});

export const saveDraftVersionSchema = z.strictObject({
  flowDefinition: agentFlowDefinitionSchema,
  inputSchema: jsonObjectSchema,
  outputSchema: jsonObjectSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const publishVersionSchema = z.strictObject({});

export type SaveDraftVersionDto = z.infer<typeof saveDraftVersionSchema>;
export const validateBlock = (block: unknown) => agentFlowNodeSchema.parse(block);
