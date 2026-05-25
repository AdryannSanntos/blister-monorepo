import { upsertAgentContextSchema } from './agent-context.dto';

describe('upsertAgentContextSchema', () => {
  it('accepts an agent context payload with instructions and references', () => {
    const parsed = upsertAgentContextSchema.parse({
      instructions: 'Sempre responder com foco operacional.',
      notes: 'Usado pelo agente de briefing.',
      references: [
        { sourceType: 'context_source', sourceId: 'ctx_1' },
        { sourceType: 'asset', sourceId: 'asset_1' },
      ],
    });

    expect(parsed.references).toHaveLength(2);
  });

  it('rejects unsupported reference source types', () => {
    const parsed = upsertAgentContextSchema.safeParse({
      references: [{ sourceType: 'private_user_memory', sourceId: 'mem_1' }],
    });

    expect(parsed.success).toBe(false);
  });
});
