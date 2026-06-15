import { Injectable } from '@nestjs/common';
import {
  type PlatformAgentAdminItem,
} from '@company-os/types';
import { AgentRegistryService } from '../agents/runtime/agent-registry.service';
import { PoliciesService } from './policies.service';

/** Preparation steps that accept a speech model override (transcription). */
const SPEECH_STEP_KEYS = new Set(['resolve_source']);

const isStepModelConfigurable = (step: {
  key: string;
  type: string;
}): boolean => {
  if (step.type === 'llm_call' || step.type === 'image_generation') return true;
  if (step.type === 'preparation' && SPEECH_STEP_KEYS.has(step.key)) return true;
  return false;
};

@Injectable()
export class PlatformAgentsService {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly policies: PoliciesService,
  ) {}

  async getAdminOverview(): Promise<PlatformAgentAdminItem[]> {
    const [catalog, policyRows, stepPolicyRows] = await Promise.all([
      this.registry.getCatalog(),
      this.policies.findAllPolicies(),
      this.policies.findAllStepPolicies(),
    ]);

    const policyMap = new Map(
      policyRows.map((policy) => [policy.agentId, policy]),
    );

    const stepPolicyMap = new Map<string, (typeof stepPolicyRows)[number]>();
    for (const stepPolicy of stepPolicyRows) {
      stepPolicyMap.set(`${stepPolicy.agentId}:${stepPolicy.stepKey}`, stepPolicy);
    }

    return catalog.map((item) => {
      const agent = this.registry.get(item.agentId);
      const policy = policyMap.get(item.agentId);

      return {
        agentId: item.agentId,
        label: item.label,
        description: item.description,
        icon: item.icon,
        capabilities: item.capabilities,
        isEnabled: item.isEnabled,
        estimatedCreditCost: item.estimatedCreditCost,
        sortOrder: item.sortOrder,
        policy: policy
          ? {
              modelId: policy.modelId,
              modelName: policy.model?.name ?? null,
              modelExternalId: policy.model?.externalId ?? null,
              markupMultiplier: policy.markupMultiplier.toString(),
              minCostPerRun: policy.minCostPerRun?.toString() ?? null,
              isEnabled: policy.isEnabled,
            }
          : null,
        steps:
          agent?.steps.map((step) => {
            const stepPolicy = stepPolicyMap.get(`${item.agentId}:${step.key}`);
            const isConfigurable = isStepModelConfigurable(step);
            const hasActiveOverride = Boolean(stepPolicy?.isEnabled);

            return {
              key: step.key,
              label: step.label,
              type: step.type,
              modelId: hasActiveOverride ? (stepPolicy?.modelId ?? null) : null,
              modelName: hasActiveOverride ? (stepPolicy?.model?.name ?? null) : null,
              modelExternalId: hasActiveOverride
                ? (stepPolicy?.model?.externalId ?? null)
                : null,
              usesAgentDefault: isConfigurable && !hasActiveOverride,
            };
          }) ?? [],
      };
    });
  }
}
