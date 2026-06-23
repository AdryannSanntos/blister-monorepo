import type { BuiltAgentDefinition } from '@company-os/agent-ia-sdk/agents';
import type { AgentDefinition, StepDefinition } from '../runtime/kernel/types';

const mapStepType = (
  type: BuiltAgentDefinition['steps'][number]['type'],
): StepDefinition['type'] => {
  if (type === 'form' || type === 'decision') {
    return 'clarification';
  }

  return type;
};

export const mapToKernelAgentDefinition = (definition: BuiltAgentDefinition): AgentDefinition => ({
  agentId: definition.agentId,
  version: definition.version,
  label: definition.label,
  description: definition.description ?? '',
  inputSchema: definition.inputSchema,
  outputSchema: definition.outputSchema,
  steps: definition.steps.map((step) => ({
    key: step.key,
    label: step.label,
    type: mapStepType(step.type),
    config: step.config,
  })),
  capabilities: definition.capabilities,
  skills: definition.skills,
});
