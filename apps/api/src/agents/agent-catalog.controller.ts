import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AgentRegistryService } from './runtime/agent-registry.service';

const updateAgentConfigSchema = z.object({
  isEnabled: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

@Controller('agents/catalog')
export class AgentCatalogController {
  constructor(private readonly registry: AgentRegistryService) {}

  @Get()
  @RequirePermission('generation.create')
  async getCatalog() {
    const agents = await this.registry.getCatalog();
    return { agents, total: agents.length };
  }

  @Get(':agentId')
  @RequirePermission('generation.create')
  async getAgent(@Param('agentId') agentId: string) {
    const agent = this.registry.get(agentId);
    if (!agent) {
      return { error: 'Agent not found' };
    }

    return {
      agentId: agent.agentId,
      label: agent.label,
      description: agent.description,
      icon: agent.icon,
      capabilities: agent.capabilities,
      isEnabled: agent.isEnabled,
      estimatedCreditCost: agent.estimatedCreditCost,
      steps: agent.steps.map((s) => ({
        key: s.key,
        label: s.label,
        type: s.type,
      })),
    };
  }

  @Patch(':agentId')
  @RequirePermission('company.update')
  async updateAgentConfig(
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const dto = updateAgentConfigSchema.parse(body);

    await this.registry.updateAgentConfig(agentId, dto);

    return { success: true, agentId };
  }
}
