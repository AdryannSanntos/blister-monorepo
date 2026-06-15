export type AgentExecutionMode = 'inline-stub' | 'inline-live' | 'trigger';

/** Shared execution mode resolution — must match WorkflowEngineService defaults. */
export const resolveAgentExecutionMode = (
  configuredMode?: string | null,
  nodeEnv: string = process.env.NODE_ENV ?? 'development',
  fallback?: AgentExecutionMode,
): AgentExecutionMode => {
  if (
    configuredMode === 'inline-stub' ||
    configuredMode === 'inline-live' ||
    configuredMode === 'trigger'
  ) {
    return configuredMode;
  }

  if (fallback) {
    return fallback;
  }

  return nodeEnv === 'production' ? 'trigger' : 'inline-live';
};

export const readAgentExecutionMode = (): AgentExecutionMode =>
  resolveAgentExecutionMode(process.env.AGENT_EXECUTION_MODE);
