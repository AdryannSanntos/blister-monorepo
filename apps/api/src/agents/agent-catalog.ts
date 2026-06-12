import type { AgentCapability } from '@company-os/types';
import { z } from 'zod';
import type { BuiltAgentDefinition } from '@company-os/agent-sdk';
import { cutsAgentDefinition } from './cuts/agent';
import { cutsInputZod, cutsOutputZod } from './cuts/schemas/output.schema';
import type { RegisteredAgent } from './runtime/agent-registry.service';

export const mapCapabilities = (capabilities: string[]): AgentCapability[] => {
  const mapped = capabilities
    .map((capability) => {
      switch (capability) {
        case 'text':
        case 'structured_output':
          return 'text_generation' as const;
        case 'strategy':
          return 'strategy' as const;
        case 'planning':
          return 'planning' as const;
        case 'analysis':
          return 'analysis' as const;
        case 'image':
          return 'image_generation' as const;
        case 'html':
          return 'text_generation' as const;
        default:
          return null;
      }
    })
    .filter((value): value is AgentCapability => value !== null);

  return [...new Set(mapped)];
};

export const toRegisteredAgent = (params: {
  definition: BuiltAgentDefinition;
  inputSchema: z.ZodType;
  outputSchema: z.ZodType;
  reviewSchema?: z.ZodType;
  icon: string;
  estimatedCreditCost: number;
}): RegisteredAgent => ({
  agentId: params.definition.agentId,
  version: params.definition.version,
  label: params.definition.label,
  description: params.definition.description,
  icon: params.icon,
  capabilities: mapCapabilities(params.definition.capabilities),
  inputSchema: params.inputSchema,
  outputSchema: params.outputSchema,
  reviewSchema: params.reviewSchema,
  steps: params.definition.steps.map((step) => ({
    key: step.key,
    label: step.label,
    type: step.type,
    config: step.config,
  })),
  isEnabled: true,
  estimatedCreditCost: params.estimatedCreditCost,
});

/**
 * Catálogo de agentes registrados na inicialização.
 *
 * Os agentes legados (MEI) foram removidos. Novos agentes devem ser
 * implementados no SDK (`packages/agent-sdk`) e registrados aqui via
 * `toRegisteredAgent`. Ver `docs/agents/agent-sdk.md`.
 */
export const buildRegisteredAgents = (): RegisteredAgent[] => [
  toRegisteredAgent({
    definition: cutsAgentDefinition,
    inputSchema: cutsInputZod,
    outputSchema: cutsOutputZod,
    reviewSchema: cutsOutputZod.pick({ cuts: true }),
    icon: 'scissors',
    estimatedCreditCost: 0.08,
  }),
];
