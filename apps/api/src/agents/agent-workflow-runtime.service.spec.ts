import { AgentWorkflowRuntimeService } from './agent-workflow-runtime.service';

const createPrismaMock = () => ({
  agentRunStep: {
    create: jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ id: `${data.blockKey}-step` })),
    update: jest.fn().mockResolvedValue({}),
  },
  agentRunSuspension: {
    create: jest.fn().mockResolvedValue({ id: 'suspension-1' }),
  },
  agentRun: {
    update: jest.fn().mockResolvedValue({}),
    findUnique: jest.fn().mockResolvedValue({ status: 'completed', outputPayload: {} }),
  },
});

describe('AgentWorkflowRuntimeService', () => {
  it('passes the initial run input to input blocks', async () => {
    const prisma = createPrismaMock();
    const registry = {
      get: jest.fn(() => async (ctx: { inputs: Record<string, unknown> }) => ({
        outputs: { payload: ctx.inputs.payload },
      })),
    };
    const runtime = new AgentWorkflowRuntimeService(prisma as never, registry as never);

    await runtime.run({
      runId: 'run-1',
      organizationId: 'org-1',
      inputPayload: { prompt: 'Generate the brief' },
      flowDefinition: {
        nodes: [{ id: 'input-1', type: 'input' }],
        edges: [],
      },
    });

    expect(prisma.agentRunStep.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outputPayload: { payload: { prompt: 'Generate the brief' } },
        }),
      }),
    );
  });

  it('passes the organization id to block executors', async () => {
    const prisma = createPrismaMock();
    const executor = jest.fn().mockResolvedValue({ outputs: { payload: {} } });
    const registry = { get: jest.fn(() => executor) };
    const runtime = new AgentWorkflowRuntimeService(prisma as never, registry as never);

    await runtime.run({
      runId: 'run-1',
      organizationId: 'org-1',
      inputPayload: {},
      flowDefinition: {
        nodes: [{ id: 'input-1', type: 'input' }],
        edges: [],
      },
    });

    expect(executor).toHaveBeenCalledWith(expect.objectContaining({ organizationId: 'org-1' }));
  });

  it('allows one output port to feed more than one downstream block', async () => {
    const prisma = createPrismaMock();
    const registry = {
      get: jest.fn((type: string) => {
        if (type === 'input') return async () => ({ outputs: { payload: { text: 'input' } } });
        return async () => ({ outputs: { default: { ok: true } } });
      }),
    };
    const runtime = new AgentWorkflowRuntimeService(prisma as never, registry as never);

    const result = await runtime.run({
      runId: 'run-1',
      flowDefinition: {
        nodes: [
          { id: 'input-1', type: 'input' },
          { id: 'form-1', type: 'form' },
          { id: 'decision-1', type: 'decision' },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'input-1',
            sourcePortKey: 'payload',
            targetNodeId: 'form-1',
            targetPortKey: 'form_basis',
          },
          {
            id: 'e2',
            sourceNodeId: 'input-1',
            sourcePortKey: 'payload',
            targetNodeId: 'decision-1',
            targetPortKey: 'subject',
          },
        ],
      },
    });

    expect(result.visitedBlockIds).toEqual(['input-1', 'form-1', 'decision-1']);
  });

  it('waits for all required named inputs before executing a multi-input node', async () => {
    const prisma = createPrismaMock();
    const registry = {
      get: jest.fn((type: string) => {
        if (type === 'input')
          return async (ctx: { blockId: string }) => ({ outputs: { payload: ctx.blockId } });
        return async () => ({ outputs: { ui_output: { blocks: [] } } });
      }),
    };
    const runtime = new AgentWorkflowRuntimeService(prisma as never, registry as never);

    const result = await runtime.run({
      runId: 'run-1',
      flowDefinition: {
        nodes: [
          { id: 'input-a', type: 'input' },
          { id: 'input-b', type: 'input' },
          { id: 'output-formatter-1', type: 'output_formatter', mergeStrategy: 'all_required' },
        ],
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'input-a',
            sourcePortKey: 'payload',
            targetNodeId: 'output-formatter-1',
            targetPortKey: 'section_a',
          },
          {
            id: 'e2',
            sourceNodeId: 'input-b',
            sourcePortKey: 'payload',
            targetNodeId: 'output-formatter-1',
            targetPortKey: 'section_b',
          },
        ],
      },
    });

    expect(result.visitedBlockIds[result.visitedBlockIds.length - 1]).toBe('output-formatter-1');
  });
});
