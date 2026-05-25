import { saveDraftVersionSchema, validateBlock } from './agent-version.dto';

describe('saveDraftVersionSchema', () => {
  it('accepts flowDefinition.config alongside nodes', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        config: {
          name: 'Workflow principal',
          objective: 'Gerar copy de LinkedIn',
          instructions: 'Tom profissional',
          fallbackMessage: 'Falhei, tente de novo.',
        },
        nodes: [
          { id: 'input', type: 'input' },
          { id: 'finalizer-1', type: 'finalizer' },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'input',
            sourcePortKey: 'payload',
            targetNodeId: 'finalizer-1',
            targetPortKey: 'default',
          },
        ],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flowDefinition.config).toEqual(
        expect.objectContaining({ name: 'Workflow principal' }),
      );
      expect(result.data.flowDefinition.nodes).toHaveLength(2);
    }
  });

  it('accepts node config carrying frontend layout metadata', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [
          {
            id: 'decision-1',
            type: 'decision',
            config: {
              prompt: 'Avaliar o tipo de conteúdo',
              position: { x: 100, y: 220 },
              successors: ['formatter-1'],
            },
          },
        ],
        edges: [],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(true);
  });

  it('accepts flowDefinition without edges (defaults to empty array)', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flowDefinition.edges).toEqual([]);
    }
  });

  it('rejects unknown keys at the flowDefinition root', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [],
        edges: [],
        extraneous: true,
      },
      inputSchema: {},
      outputSchema: {},
    });

    expect(result.success).toBe(false);
  });

  it('accepts llm_call and output nodes used by the workflow builder', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [
          { id: 'input_1', type: 'input', config: { label: 'Inicio' } },
          {
            id: 'llm_1',
            type: 'llm_call',
            config: {
              label: 'Gerar',
              prompt: 'Escreva o email',
              providerId: 'provider-1',
              modelId: 'model-1',
            },
          },
          { id: 'output_1', type: 'output', config: { label: 'Saida' } },
        ],
        edges: [
          {
            sourceNodeId: 'input_1',
            sourcePortKey: 'default',
            targetNodeId: 'llm_1',
            targetPortKey: 'default',
          },
        ],
      },
      inputSchema: {},
      outputSchema: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flowDefinition.edges[0]?.id).toContain('input_1');
    }
  });

  it('normalizes incomplete form blocks before validating', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [{ id: 'form_1', type: 'form', config: { label: 'Dados' } }],
        edges: [],
      },
      inputSchema: {},
      outputSchema: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const formNode = result.data.flowDefinition.nodes.find((node) => node.type === 'form');
      expect(formNode?.type).toBe('form');
      if (formNode?.type === 'form') {
        expect(formNode.config.title).toBe('Dados');
        expect(formNode.config.fields.length).toBeGreaterThan(0);
      }
    }
  });

  it('rejects nodes with invalid block types', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [{ id: 'x', type: 'unknown_block' }],
        edges: [],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('validateBlock', () => {
  it('accepts an agent_call block with target agent mapping', () => {
    expect(() =>
      validateBlock({
        id: 'call-1',
        type: 'agent_call',
        config: { targetAgentId: 'agent_2', inputTemplate: '{{input}}' },
      }),
    ).not.toThrow();
  });

  it('accepts a form block with ai-generated option instructions', () => {
    expect(() =>
      validateBlock({
        id: 'form-1',
        type: 'form',
        config: {
          title: 'Coletar contexto',
          generationInstructions: 'Gerar opcoes relevantes para o publico-alvo.',
          fields: [{ id: 'audience', label: 'Publico', type: 'single_select', required: true }],
        },
      }),
    ).not.toThrow();
  });

  it('accepts input block', () => {
    expect(() => validateBlock({ id: 'input-1', type: 'input' })).not.toThrow();
  });

  it('accepts validation block with human_review mode', () => {
    expect(() =>
      validateBlock({
        id: 'val-1',
        type: 'validation',
        config: { mode: 'human_review', criteria: 'Deve ser coerente' },
      }),
    ).not.toThrow();
  });

  it('accepts merge strategy metadata for multi-input blocks', () => {
    const block = validateBlock({
      id: 'formatter-1',
      type: 'output_formatter',
      mergeStrategy: 'object_merge',
      config: { inputMappings: { result: 'agent_call.result' } },
    });

    expect(block.mergeStrategy).toBe('object_merge');
  });

  it('rejects block with unknown type', () => {
    expect(() => validateBlock({ id: 'x', type: 'llm_generate' })).toThrow();
  });
});
