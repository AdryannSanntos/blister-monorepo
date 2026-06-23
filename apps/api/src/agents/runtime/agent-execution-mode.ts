export type AgentExecutionMode = 'trigger';

/** All agent runs execute via Trigger.dev workers. */
export const resolveAgentExecutionMode = (
  configuredMode?: string | null,
): AgentExecutionMode => {
  if (configuredMode && configuredMode !== 'trigger') {
    throw new Error(
      `Unsupported AGENT_EXECUTION_MODE="${configuredMode}". Only "trigger" is supported.`,
    );
  }
  return 'trigger';
};

export const readAgentExecutionMode = (): AgentExecutionMode =>
  resolveAgentExecutionMode(process.env.AGENT_EXECUTION_MODE);
