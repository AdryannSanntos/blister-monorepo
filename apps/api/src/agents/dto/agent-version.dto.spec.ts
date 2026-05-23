import { saveDraftVersionSchema } from './agent-version.dto';

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
          { id: 'gen', type: 'llm_generate', config: { prompt: 'Olá' } },
          { id: 'output', type: 'output' },
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
      expect(result.data.flowDefinition.nodes).toHaveLength(3);
    }
  });

  it('accepts node config carrying frontend layout metadata', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [
          {
            id: 'gen',
            type: 'llm_generate',
            config: {
              label: 'Gerar copy',
              prompt: '{{briefing}}',
              position: { x: 100, y: 220 },
              successors: ['output'],
            },
          },
        ],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects unknown keys at the flowDefinition root', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [],
        extraneous: true,
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects nodes with invalid block types', () => {
    const result = saveDraftVersionSchema.safeParse({
      flowDefinition: {
        nodes: [{ id: 'x', type: 'unknown_block' }],
      },
      inputSchema: {},
      outputSchema: {},
    });
    expect(result.success).toBe(false);
  });
});
