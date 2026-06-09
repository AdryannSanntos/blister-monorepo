import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { PrismaService } from '../prisma/prisma.service';
import type {
  updateAgentPolicySchema,
  updatePipelineSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllPolicies() {
    return this.prisma.agentModelPolicy.findMany({
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async updatePolicy(
    agentId: string,
    dto: z.infer<typeof updateAgentPolicySchema>,
  ) {
    return this.prisma.agentModelPolicy.upsert({
      where: { agentId },
      update: dto,
      create: {
        agentId,
        modelId: dto.modelId!,
        markupMultiplier: dto.markupMultiplier ?? 1.2,
        isEnabled: dto.isEnabled ?? true,
        minCostPerRun: dto.minCostPerRun ?? null,
      },
    });
  }

  async getPipeline() {
    return this.prisma.pipelineAgentConfig.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  async updatePipeline(dto: z.infer<typeof updatePipelineSchema>) {
    return this.prisma.$transaction(
      dto.agents.map((agent) =>
        this.prisma.pipelineAgentConfig.upsert({
          where: { agentId: agent.agentId },
          update: { sortOrder: agent.sortOrder, isEnabled: agent.isEnabled },
          create: {
            agentId: agent.agentId,
            sortOrder: agent.sortOrder,
            isEnabled: agent.isEnabled,
          },
        }),
      ),
    );
  }
}
