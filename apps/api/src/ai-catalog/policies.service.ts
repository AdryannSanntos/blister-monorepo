import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { z } from 'zod';
import { AgentRegistryService } from '../agents/runtime/agent-registry.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  updateAgentPolicySchema,
  updateAgentStepPoliciesBatchSchema,
  updateAgentStepPolicySchema,
  updatePipelineSchema,
} from './dto/ai-catalog.dto';

/** Preparation steps that accept a speech model override (transcription). */
const SPEECH_STEP_KEYS = new Set(['resolve_source']);

@Injectable()
export class PoliciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly agentRegistry: AgentRegistryService,
  ) {}

  async findAllPolicies() {
    return this.prisma.agentModelPolicy.findMany({
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async findAllStepPolicies() {
    return this.prisma.agentStepModelPolicy.findMany({
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async findStepPoliciesByAgent(agentId: string) {
    return this.prisma.agentStepModelPolicy.findMany({
      where: { agentId },
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async updatePolicy(
    agentId: string,
    dto: z.infer<typeof updateAgentPolicySchema>,
  ) {
    this.assertAgentExists(agentId);

    if (dto.modelId) {
      await this.assertModelExists(dto.modelId);
    }

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

  async updateStepPolicy(
    agentId: string,
    stepKey: string,
    dto: z.infer<typeof updateAgentStepPolicySchema>,
  ) {
    this.assertConfigurableStep(agentId, stepKey);

    if (dto.modelId === undefined && dto.isEnabled === undefined) {
      throw new BadRequestException('At least one field must be provided');
    }

    if (dto.modelId === null) {
      await this.prisma.agentStepModelPolicy.deleteMany({
        where: { agentId, stepKey },
      });
      return null;
    }

    if (dto.modelId) {
      await this.assertModelExists(dto.modelId);
    }

    const existing = await this.prisma.agentStepModelPolicy.findUnique({
      where: { agentId_stepKey: { agentId, stepKey } },
    });

    if (!dto.modelId && !existing) {
      throw new BadRequestException(
        'Cannot update isEnabled without an existing step policy or modelId',
      );
    }

    if (!dto.modelId) {
      return this.prisma.agentStepModelPolicy.update({
        where: { agentId_stepKey: { agentId, stepKey } },
        data: { isEnabled: dto.isEnabled },
        include: {
          model: { select: { id: true, name: true, externalId: true } },
        },
      });
    }

    return this.prisma.agentStepModelPolicy.upsert({
      where: { agentId_stepKey: { agentId, stepKey } },
      update: {
        modelId: dto.modelId,
        isEnabled: dto.isEnabled ?? true,
      },
      create: {
        agentId,
        stepKey,
        modelId: dto.modelId,
        isEnabled: dto.isEnabled ?? true,
      },
      include: {
        model: { select: { id: true, name: true, externalId: true } },
      },
    });
  }

  async updateStepPoliciesBatch(
    agentId: string,
    dto: z.infer<typeof updateAgentStepPoliciesBatchSchema>,
  ) {
    this.assertAgentExists(agentId);

    for (const step of dto.steps) {
      this.assertConfigurableStep(agentId, step.stepKey);
      if (step.modelId) {
        await this.assertModelExists(step.modelId);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const step of dto.steps) {
        if (step.modelId === null) {
          await tx.agentStepModelPolicy.deleteMany({
            where: { agentId, stepKey: step.stepKey },
          });
          results.push(null);
          continue;
        }

        const policy = await tx.agentStepModelPolicy.upsert({
          where: { agentId_stepKey: { agentId, stepKey: step.stepKey } },
          update: { modelId: step.modelId! },
          create: {
            agentId,
            stepKey: step.stepKey,
            modelId: step.modelId!,
            isEnabled: true,
          },
          include: {
            model: { select: { id: true, name: true, externalId: true } },
          },
        });
        results.push(policy);
      }

      return results;
    });
  }

  async deleteStepPolicy(agentId: string, stepKey: string) {
    this.assertConfigurableStep(agentId, stepKey);
    await this.prisma.agentStepModelPolicy.deleteMany({
      where: { agentId, stepKey },
    });
    return { deleted: true };
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

  private assertAgentExists(agentId: string): void {
    if (!this.agentRegistry.get(agentId)) {
      throw new NotFoundException(`Agent not found: ${agentId}`);
    }
  }

  private assertConfigurableStep(agentId: string, stepKey: string): void {
    const agent = this.agentRegistry.get(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent not found: ${agentId}`);
    }

    const step = agent.steps.find((item) => item.key === stepKey);
    if (!step) {
      throw new NotFoundException(`Step not found: ${stepKey}`);
    }

    if (step.type === 'llm_call' || step.type === 'image_generation') {
      return;
    }

    if (step.type === 'preparation' && SPEECH_STEP_KEYS.has(stepKey)) {
      return;
    }

    throw new BadRequestException(
      `Step "${stepKey}" does not support model configuration`,
    );
  }

  private async assertModelExists(modelId: string): Promise<void> {
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new NotFoundException(`Model not found: ${modelId}`);
    }

    if (!model.isEnabled) {
      throw new BadRequestException(`Model is disabled: ${modelId}`);
    }
  }
}
