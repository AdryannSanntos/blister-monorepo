import type { AgentCapability } from '@company-os/types';
import { z } from 'zod';
import { copywriterAgentDefinition } from './copywriter/agent';
import { copywriterInputZod, copywriterOutputZod } from './copywriter/schemas/output.schema';
import { designerAgentDefinition } from './designer/agent';
import { designerInputZod, designerOutputZod } from './designer/schemas/output.schema';
import { postAgentDefinition } from './post/agent';
import { postInputZod, postOutputZod, postReviewZod } from './post/schemas/output.schema';
import type { RegisteredAgent } from './runtime/agent-registry.service';
import { strategistAgentDefinition } from './strategist/agent';
import { strategistInputZod, strategistOutputZod } from './strategist/schemas/output.schema';

const mapCapabilities = (capabilities: string[]): AgentCapability[] => {
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

const toRegisteredAgent = (params: {
  definition: typeof copywriterAgentDefinition;
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

export const buildRegisteredAgents = (): RegisteredAgent[] => [
  toRegisteredAgent({
    definition: strategistAgentDefinition,
    inputSchema: strategistInputZod,
    outputSchema: strategistOutputZod,
    icon: 'compass',
    estimatedCreditCost: 0.05,
  }),
  toRegisteredAgent({
    definition: copywriterAgentDefinition,
    inputSchema: copywriterInputZod,
    outputSchema: copywriterOutputZod,
    reviewSchema: copywriterOutputZod.pick({ caption: true, hashtags: true }),
    icon: 'pen-tool',
    estimatedCreditCost: 0.03,
  }),
  toRegisteredAgent({
    definition: designerAgentDefinition,
    inputSchema: designerInputZod,
    outputSchema: designerOutputZod,
    icon: 'image',
    estimatedCreditCost: 0.1,
  }),
  toRegisteredAgent({
    definition: postAgentDefinition,
    inputSchema: postInputZod,
    outputSchema: postOutputZod,
    reviewSchema: postReviewZod,
    icon: 'package',
    estimatedCreditCost: 0.22,
  }),
];
