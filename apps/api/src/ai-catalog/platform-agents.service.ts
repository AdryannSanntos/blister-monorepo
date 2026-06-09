import { Injectable } from '@nestjs/common';
import type { PlatformAgentAdminItem } from '@company-os/types';
import { AgentRegistryService } from '../agents/runtime/agent-registry.service';
import { PoliciesService } from './policies.service';

@Injectable()
export class PlatformAgentsService {
  constructor(
    private readonly registry: AgentRegistryService,
    private readonly policies: PoliciesService,
  ) {}

  async getAdminOverview(): Promise<PlatformAgentAdminItem[]> {
    const [catalog, policyRows] = await Promise.all([
      this.registry.getCatalog(),
      this.policies.findAllPolicies(),
    ]);

    const policyMap = new Map(
      policyRows.map((policy) => [policy.agentId, policy]),
    );

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
          agent?.steps.map((step) => ({
            key: step.key,
            label: step.label,
            type: step.type,
          })) ?? [],
      };
    });
  }
}
