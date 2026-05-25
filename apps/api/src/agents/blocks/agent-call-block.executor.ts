import type { BlockExecutorFn } from '../agent-block-executor.registry';

const MAX_DEPTH = Number(process.env.AGENT_CALL_MAX_DEPTH ?? '3');

export function createAgentCallExecutor(
  agentRunsService: {
    createQueuedRun: (
      orgId: string,
      agentId: string,
      userId: string,
      input: { input: Record<string, unknown> },
      parentContext?: { parentRunId: string; parentStepId?: string; depth: number },
    ) => Promise<{ id: string }>;
  },
  agentWorkflowRuntime: {
    awaitRunCompletion: (runId: string) => Promise<{ finalOutput?: unknown }>;
  },
): BlockExecutorFn {
  return async (ctx) => {
    const targetAgentId =
      typeof ctx.blockConfig.targetAgentId === 'string' ? ctx.blockConfig.targetAgentId : null;

    if (!targetAgentId) {
      throw new Error('agent_call block requires targetAgentId in config');
    }

    const currentDepth =
      typeof (ctx.runState as Record<string, unknown>).__depth === 'number'
        ? ((ctx.runState as Record<string, unknown>).__depth as number)
        : 0;

    if (currentDepth >= MAX_DEPTH) {
      throw new Error(`Max subagent depth (${MAX_DEPTH}) exceeded`);
    }

    const childRun = await agentRunsService.createQueuedRun(
      ctx.organizationId,
      targetAgentId,
      ((ctx as unknown as Record<string, unknown>).userId as string) ?? 'system',
      { input: { ...ctx.inputs, __parentRunId: ctx.runId, __depth: currentDepth + 1 } },
      { parentRunId: ctx.runId, parentStepId: ctx.stepId, depth: currentDepth + 1 },
    );

    const result = await agentWorkflowRuntime.awaitRunCompletion(childRun.id);

    return {
      outputs: { result: result.finalOutput ?? {} },
    };
  };
}
