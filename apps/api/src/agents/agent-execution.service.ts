import { Injectable, NotFoundException } from '@nestjs/common';
import { tasks } from '@trigger.dev/sdk';
import { CreditsService } from '../credits/credits.service';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import type { AgentRunTaskPayload } from '../../trigger/shared/agent-runtime-payloads';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class AgentExecutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
    private readonly creditsService: CreditsService,
  ) {}

  async enqueueRun(payload: AgentRunTaskPayload): Promise<unknown> {
    return tasks.trigger('agent-run', payload);
  }

  async processRun(payload: AgentRunTaskPayload) {
    const run = await this.prisma.agentRun.findFirst({
      where: {
        id: payload.agentRunId,
        organizationId: payload.organizationId,
        agentId: payload.agentId,
        agentVersionId: payload.agentVersionId,
      },
      include: {
        agentVersion: true,
      },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    await this.prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'running', errorMessage: null },
    });

    try {
      const output = await this.executeFlow(
        run.id,
        run.organizationId,
        run.inputPayload,
        run.agentVersion.flowDefinition,
      );

      for (const usageEntry of output.usage) {
        const entry = usageEntry as Record<string, unknown>;
        const usage = (entry.usage as Record<string, unknown> | undefined) ?? {};
        const totalTokens = typeof usage.totalTokens === 'number' ? usage.totalTokens : 0;
        const technicalAmount = Number((totalTokens / 1000).toFixed(4));

        if (technicalAmount > 0) {
          await this.creditsService.recordTechnicalCost({
            organizationId: run.organizationId,
            runId: run.id,
            providerId: typeof entry.providerId === 'string' ? entry.providerId : undefined,
            modelId: typeof entry.modelId === 'string' ? entry.modelId : undefined,
            amount: technicalAmount,
            metadata: { totalTokens },
          });
        }
      }

      await this.creditsService.debitRunCredits(run.id, Math.max(1, output.usage.length), {
        strict: false,
      });

      await this.prisma.agentRun.update({
        where: { id: run.id },
        data: { status: 'success', outputPayload: toJsonValue(output) },
      });

      return { runId: run.id, status: 'success' as const, output };
    } catch (error) {
      await this.storeRunError(run.id, error instanceof Error ? error.message : 'Agent execution failed');
      throw error;
    }
  }

  async storeRunError(runId: string, message: string) {
    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { status: 'error', errorMessage: message },
    });
  }

  private async executeFlow(
    runId: string,
    organizationId: string,
    inputPayload: unknown,
    flowDefinition: unknown,
  ) {
    const flow = flowDefinition && typeof flowDefinition === 'object' && !Array.isArray(flowDefinition)
      ? (flowDefinition as Record<string, unknown>)
      : {};
    const nodes = Array.isArray(flow.nodes) ? flow.nodes : [];

    let previousOutput: unknown = inputPayload;
    const usage: Array<Record<string, unknown>> = [];

    for (const node of nodes) {
      const currentNode = node && typeof node === 'object' ? (node as Record<string, unknown>) : {};
      const nodeId = typeof currentNode.id === 'string' ? currentNode.id : 'unknown';
      const nodeType = typeof currentNode.type === 'string' ? currentNode.type : 'passthrough';
      const config = currentNode.config && typeof currentNode.config === 'object'
        ? (currentNode.config as Record<string, unknown>)
        : {};

      if (nodeType === 'input') {
        await this.prisma.agentRunStep.create({
          data: {
            runId,
            blockKey: nodeId,
            blockType: nodeType,
            status: 'success',
            inputPayload: toJsonValue(inputPayload ?? {}),
            outputPayload: toJsonValue(inputPayload ?? {}),
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        previousOutput = inputPayload;
        continue;
      }

      let stepOutput: unknown = previousOutput;
      const stepInput = previousOutput;
      if (nodeType === 'llm_generate') {
        const result = await this.aiRuntimeService.generateText({
          organizationId,
          providerId: typeof config.providerId === 'string' ? config.providerId : undefined,
          modelId: typeof config.modelId === 'string' ? config.modelId : undefined,
          prompt:
            typeof config.prompt === 'string'
              ? config.prompt
              : JSON.stringify(previousOutput ?? {}),
        });
        stepOutput = { text: result.text };
        usage.push({ providerId: result.providerId, modelId: result.modelId, usage: result.usage });
      } else if (nodeType === 'image_generate') {
        const result = await this.aiRuntimeService.generateImage({
          organizationId,
          providerId: typeof config.providerId === 'string' ? config.providerId : undefined,
          modelId: typeof config.modelId === 'string' ? config.modelId : undefined,
          prompt:
            typeof config.prompt === 'string'
              ? config.prompt
              : JSON.stringify(previousOutput ?? {}),
          size: typeof config.size === 'string' ? config.size : undefined,
        });
        stepOutput = { images: result.images };
        usage.push({ providerId: result.providerId, modelId: result.modelId, usage: result.usage });
      } else if (nodeType === 'output') {
        stepOutput = previousOutput;
      }

      previousOutput = stepOutput;

      await this.prisma.agentRunStep.create({
        data: {
          runId,
          blockKey: nodeId,
          blockType: nodeType,
          status: 'success',
          inputPayload: toJsonValue(stepInput ?? {}),
          outputPayload: toJsonValue(stepOutput ?? {}),
          startedAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    return { result: previousOutput, usage };
  }
}
