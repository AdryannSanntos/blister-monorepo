import { agentRunContextSnapshotSchema, agentRunLineageSchema } from './agent-run.dto';

describe('agent run DTOs', () => {
  it('accepts a run context snapshot with layered sources', () => {
    const parsed = agentRunContextSnapshotSchema.parse({
      runId: 'run_1',
      layers: {
        company: { summary: 'empresa' },
        agent: { summary: 'agente' },
      },
      items: [{ sourceType: 'agent_file', sourceId: 'file_1', label: 'Brand PDF' }],
    });

    expect(parsed.items[0]?.sourceType).toBe('agent_file');
  });

  it('accepts parent-child lineage metadata for subagent runs', () => {
    const parsed = agentRunLineageSchema.parse({
      rootRunId: 'run_root',
      parentRunId: 'run_parent',
      parentStepId: 'step_call',
      depth: 2,
    });

    expect(parsed.depth).toBe(2);
  });
});
