import type { BlockExecutorFn } from '../agent-block-executor.registry';

const DEFAULT_MAX_DEPTH = Number(process.env.AGENT_CALL_MAX_DEPTH ?? '3');

interface AgentRunsServiceLike {
  createQueuedRun: (
    orgId: string,
    agentId: string,
    userId: string,
    input: { input: Record<string, unknown> },
    parentContext?: { parentRunId: string; parentStepId?: string; depth: number },
  ) => Promise<{ id: string }>;
}

interface AgentWorkflowRuntimeLike {
  awaitRunCompletion: (runId: string) => Promise<{ finalOutput?: unknown }>;
}

export function createAgentCallExecutor(
  agentRunsService: AgentRunsServiceLike,
  agentWorkflowRuntime: AgentWorkflowRuntimeLike,
  options: { maxDepth?: number } = {},
): BlockExecutorFn {
  const maxDepth = options.maxDepth ?? DEFAULT_MAX_DEPTH;

  return async (ctx) => {
    const targetAgentId =
      typeof ctx.blockConfig.targetAgentId === 'string' ? ctx.blockConfig.targetAgentId : null;

    if (!targetAgentId) {
      throw new Error('agent_call block requires targetAgentId in config');
    }

    if (ctx.agentId && targetAgentId === ctx.agentId) {
      throw new Error('agent_call cannot recursively invoke the same agent');
    }

    const nextDepth = (ctx.depth ?? 0) + 1;

    if (nextDepth > maxDepth) {
      throw new Error(`Max subagent depth (${maxDepth}) exceeded`);
    }

    if (!ctx.userId) {
      throw new Error('agent_call requires the parent run owner userId');
    }

    const childRun = await agentRunsService.createQueuedRun(
      ctx.organizationId,
      targetAgentId,
      ctx.userId,
      {
        input: {
          ...ctx.inputs,
          __parentRunId: ctx.runId,
          __depth: nextDepth,
        },
      },
      {
        parentRunId: ctx.runId,
        parentStepId: ctx.stepId,
        depth: nextDepth,
      },
    );

    const result = await agentWorkflowRuntime.awaitRunCompletion(childRun.id);

    return {
      outputs: {
        result: result.finalOutput ?? {},
        childRunId: childRun.id,
      },
    };
  };
}
