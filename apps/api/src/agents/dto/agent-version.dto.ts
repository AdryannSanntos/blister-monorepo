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
  // Phase 1 new block types
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('decision'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('boolean'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('if_else'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('agent_call'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('clarification'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('form'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('validation'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('output_formatter'),
    config: jsonObjectSchema.default({}),
  }),
  z.strictObject({
    id: z.string().min(1),
    type: z.literal('finalizer'),
    config: jsonObjectSchema.default({}),
  }),
]);

const agentFlowEdgeSchema = z.object({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortKey: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPortKey: z.string().min(1),
});

export const agentFlowDefinitionSchema = z.strictObject({
  nodes: z.array(agentFlowNodeSchema).default([]),
  edges: z.array(agentFlowEdgeSchema).default([]),
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
export type AgentFlowEdge = z.infer<typeof agentFlowEdgeSchema>;
export type AgentFlowDefinition = z.infer<typeof agentFlowDefinitionSchema>;
export const validateBlock = (block: unknown) => agentFlowNodeSchema.parse(block);
