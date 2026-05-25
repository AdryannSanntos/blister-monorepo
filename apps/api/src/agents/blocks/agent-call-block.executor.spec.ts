import type { BlockExecutionContext } from '../agent-block-executor.registry';
import { createAgentCallExecutor } from './agent-call-block.executor';

const buildCtx = (overrides: Partial<BlockExecutionContext> = {}): BlockExecutionContext => ({
  runId: 'parent-run',
  organizationId: 'org-1',
  userId: 'user-1',
  parentRunId: null,
  rootRunId: null,
  depth: 0,
  stepId: 'step-1',
  blockId: 'agent-call-1',
  blockType: 'agent_call',
  blockConfig: { targetAgentId: 'agent-target' },
  inputs: { brief: 'do it' },
  runState: {},
  ...overrides,
});

describe('agent_call executor', () => {
  it('requires targetAgentId', async () => {
    const executor = createAgentCallExecutor(
      { createQueuedRun: jest.fn() } as never,
      { awaitRunCompletion: jest.fn() } as never,
    );

    await expect(executor(buildCtx({ blockConfig: {} }))).rejects.toThrow(
      'agent_call block requires targetAgentId in config',
    );
  });

  it('requires the parent userId', async () => {
    const executor = createAgentCallExecutor(
      { createQueuedRun: jest.fn() } as never,
      { awaitRunCompletion: jest.fn() } as never,
    );

    await expect(executor(buildCtx({ userId: undefined }))).rejects.toThrow(
      'agent_call requires the parent run owner userId',
    );
  });

  it('blocks self-recursion', async () => {
    const executor = createAgentCallExecutor(
      { createQueuedRun: jest.fn() } as never,
      { awaitRunCompletion: jest.fn() } as never,
    );

    await expect(
      executor(
        buildCtx({
          blockConfig: { targetAgentId: 'agent-a', currentAgentId: 'agent-a' },
        }),
      ),
    ).rejects.toThrow('agent_call cannot recursively invoke the same agent');
  });

  it('enforces max depth', async () => {
    const executor = createAgentCallExecutor(
      { createQueuedRun: jest.fn() } as never,
      { awaitRunCompletion: jest.fn() } as never,
      { maxDepth: 2 },
    );

    await expect(executor(buildCtx({ depth: 2 }))).rejects.toThrow(
      'Max subagent depth (2) exceeded',
    );
  });

  it('spawns child run with parent context and returns its output', async () => {
    const createQueuedRun = jest.fn().mockResolvedValue({ id: 'child-run' });
    const awaitRunCompletion = jest.fn().mockResolvedValue({ finalOutput: { ok: true } });

    const executor = createAgentCallExecutor(
      { createQueuedRun } as never,
      { awaitRunCompletion } as never,
    );

    const result = await executor(buildCtx({ depth: 1 }));

    expect(createQueuedRun).toHaveBeenCalledWith(
      'org-1',
      'agent-target',
      'user-1',
      expect.objectContaining({
        input: expect.objectContaining({
          brief: 'do it',
          __parentRunId: 'parent-run',
          __depth: 2,
        }),
      }),
      { parentRunId: 'parent-run', parentStepId: 'step-1', depth: 2 },
    );
    expect(awaitRunCompletion).toHaveBeenCalledWith('child-run');
    expect(result.outputs).toEqual({ result: { ok: true }, childRunId: 'child-run' });
  });
});
