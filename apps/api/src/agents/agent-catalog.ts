import type { AgentCapability } from '@company-os/types';
import { z } from 'zod';
import type { BuiltAgentDefinition } from '@company-os/agent-ia-sdk/agents';
import { cutsAgentDefinition } from './cuts/agent';
import { cutsInputZod, cutsOutputZod } from './cuts/schemas/output.schema';
import { carouselAgentDefinition } from './carousel/agent';
import { carouselInputZod, carouselOutputZod } from './carousel/schemas/carousel-schemas';
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
 * Registered agents loaded at API startup.
 *
 * Legacy MEI agents were removed. New agents live under
 * `apps/api/src/agents/<agentId>/` and register here via `toRegisteredAgent`.
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
  toRegisteredAgent({
    definition: carouselAgentDefinition,
    inputSchema: carouselInputZod,
    outputSchema: carouselOutputZod,
    icon: 'gallery-horizontal',
    estimatedCreditCost: 0.12,
  }),
];
