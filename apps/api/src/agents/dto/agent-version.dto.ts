import { z } from 'zod';

const jsonObjectSchema = z.record(z.string(), z.unknown()).default({});
const looseConfigSchema = z.object({}).catchall(z.unknown()).default({});

export const mergeStrategySchema = z.enum([
  'all_required',
  'any_first',
  'append_list',
  'object_merge',
  'manual_mapping',
]);

export const agentFlowEdgeSchema = z.strictObject({
  id: z.string().min(1),
  sourceNodeId: z.string().min(1),
  sourcePortKey: z.string().min(1),
  targetNodeId: z.string().min(1),
  targetPortKey: z.string().min(1),
});

const baseNodeSchema = {
  id: z.string().min(1),
  mergeStrategy: mergeStrategySchema.optional(),
  config: jsonObjectSchema.optional(),
};

const inputMappingSchema = z.record(z.string(), z.string().min(1)).optional();

const formFieldSchema = z.strictObject({
  id: z.string().min(1),
  label: z.string().trim().min(1).max(160),
  type: z.enum([
    'text',
    'textarea',
    'select',
    'single_select',
    'multi_select',
    'number',
    'boolean',
  ]),
  required: z.boolean().default(false),
  options: z.array(z.string().trim().min(1)).optional(),
  placeholder: z.string().optional(),
});

export const agentFlowNodeSchema = z.discriminatedUnion('type', [
  z.strictObject({ ...baseNodeSchema, type: z.literal('input') }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('decision'),
    config: z
      .object({
        prompt: z.string().optional(),
        routes: z.array(z.strictObject({ key: z.string(), label: z.string() })).optional(),
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('boolean'),
    config: z
      .object({
        prompt: z.string().optional(),
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('if_else'),
    config: z
      .object({
        conditionPortKey: z.string().optional(),
        payloadPortKey: z.string().optional(),
        inputMappings: inputMappingSchema,
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('llm_call'),
    config: z
      .object({
        label: z.string().optional(),
        prompt: z.string().optional(),
        providerId: z.string().optional(),
        modelId: z.string().optional(),
        inputMappings: inputMappingSchema,
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('output'),
    config: looseConfigSchema.optional(),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('agent_call'),
    config: z
      .object({
        targetAgentId: z.string().min(1),
        inputTemplate: z.string().optional(),
        inputMappings: inputMappingSchema,
        maxDepth: z.number().int().min(1).max(10).optional(),
      })
      .catchall(z.unknown()),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('clarification'),
    config: z
      .object({
        questionTemplate: z.string().optional(),
        inputMappings: inputMappingSchema,
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('form'),
    config: z
      .object({
        title: z.string().min(1).default('Formulário'),
        generationInstructions: z.string().optional(),
        inputMappings: inputMappingSchema,
        fields: z
          .array(formFieldSchema)
          .min(1)
          .default([
            {
              id: 'campo_1',
              label: 'Descreva o que você precisa',
              type: 'textarea',
              required: true,
            },
          ]),
      })
      .catchall(z.unknown())
      .default({
        title: 'Formulário',
        fields: [
          { id: 'campo_1', label: 'Descreva o que você precisa', type: 'textarea', required: true },
        ],
      }),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('validation'),
    config: z
      .object({
        mode: z.enum(['internal', 'human_review']).default('internal'),
        criteria: z.string().optional(),
        inputMappings: inputMappingSchema,
      })
      .catchall(z.unknown())
      .default({ mode: 'internal' }),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('output_formatter'),
    config: z
      .object({
        inputMappings: inputMappingSchema,
        outputBlocks: z
          .array(z.enum(['text', 'markdown', 'list', 'card', 'image', 'cta']))
          .optional(),
      })
      .catchall(z.unknown())
      .default({}),
  }),
  z.strictObject({
    ...baseNodeSchema,
    type: z.literal('finalizer'),
    config: looseConfigSchema.optional(),
  }),
]);

export type AgentFlowEdge = z.infer<typeof agentFlowEdgeSchema>;
export type AgentFlowNode = z.infer<typeof agentFlowNodeSchema>;

const normalizeFlowEdge = (edge: unknown) => {
  if (!edge || typeof edge !== 'object') {
    return edge;
  }

  const record = edge as Record<string, unknown>;
  const sourceNodeId = typeof record.sourceNodeId === 'string' ? record.sourceNodeId : '';
  const targetNodeId = typeof record.targetNodeId === 'string' ? record.targetNodeId : '';
  const sourcePortKey = typeof record.sourcePortKey === 'string' ? record.sourcePortKey : 'default';
  const targetPortKey = typeof record.targetPortKey === 'string' ? record.targetPortKey : 'default';

  return {
    ...record,
    id:
      typeof record.id === 'string' && record.id.length > 0
        ? record.id
        : `${sourceNodeId}-${sourcePortKey}-${targetNodeId}-${targetPortKey}`,
    sourceNodeId,
    sourcePortKey,
    targetNodeId,
    targetPortKey,
  };
};

const normalizeFlowNode = (node: unknown) => {
  if (!node || typeof node !== 'object') {
    return node;
  }

  const record = node as Record<string, unknown>;
  if (record.type !== 'form' || !record.config || typeof record.config !== 'object') {
    return record;
  }

  const config = { ...(record.config as Record<string, unknown>) };
  if (typeof config.title !== 'string' || config.title.trim().length === 0) {
    config.title =
      typeof config.label === 'string' && config.label.trim().length > 0
        ? config.label
        : 'Formulário';
  }

  if (!Array.isArray(config.fields) || config.fields.length === 0) {
    config.fields = [
      { id: 'campo_1', label: 'Descreva o que você precisa', type: 'textarea', required: true },
    ];
  }

  return { ...record, config };
};

const normalizeFlowDefinitionInput = (value: unknown) => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const nodes = Array.isArray(record.nodes) ? record.nodes.map(normalizeFlowNode) : [];
  const edges = Array.isArray(record.edges) ? record.edges.map(normalizeFlowEdge) : [];

  return { ...record, nodes, edges };
};

export const agentFlowDefinitionSchema = z.strictObject({
  nodes: z.array(agentFlowNodeSchema).default([]),
  edges: z.array(agentFlowEdgeSchema).default([]),
  config: jsonObjectSchema.optional(),
});

export const saveDraftVersionSchema = z.strictObject({
  flowDefinition: z.preprocess(normalizeFlowDefinitionInput, agentFlowDefinitionSchema),
  inputSchema: jsonObjectSchema,
  outputSchema: jsonObjectSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const publishVersionSchema = z.strictObject({});

export type SaveDraftVersionDto = z.infer<typeof saveDraftVersionSchema>;
export type AgentFlowDefinition = z.infer<typeof agentFlowDefinitionSchema>;
export const validateBlock = (block: unknown) => agentFlowNodeSchema.parse(block);
