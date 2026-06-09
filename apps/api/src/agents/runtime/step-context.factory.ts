import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ContextPackService } from '../../rag/context-pack.service';
import { AiRuntimeService } from '../../ai-runtime/ai-runtime.service';
import type { StepExecutionContext } from './agent-registry.service';

export interface CreateContextOptions {
  runId: string;
  agentId: string;
  companyId: string;
  campaignId: string | null;
  stepKey: string;
  stepIndex: number;
  inputPayload: Record<string, unknown>;
}

@Injectable()
export class StepContextFactory {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contextPackService: ContextPackService,
    private readonly aiRuntime: AiRuntimeService,
  ) {}

  async create(options: CreateContextOptions): Promise<StepExecutionContext> {
    const [brandProfile, contextPack, previousSteps] = await Promise.all([
      this.getBrandProfile(options.companyId),
      this.buildContextPack(options),
      this.getPreviousStepsOutput(options.runId),
    ]);

    return {
      runId: options.runId,
      agentId: options.agentId,
      companyId: options.companyId,
      campaignId: options.campaignId,
      stepKey: options.stepKey,
      stepIndex: options.stepIndex,
      inputPayload: options.inputPayload,
      previousStepsOutput: previousSteps,
      contextPack,
      brandProfile,
      llmComplete: this.createLlmCompleteFunction(options.agentId),
    };
  }

  private async getBrandProfile(companyId: string) {
    return this.prisma.brandProfile.findUnique({
      where: { companyId },
    });
  }

  private async buildContextPack(options: CreateContextOptions) {
    const userInput = (options.inputPayload as { userInput?: string }).userInput ?? '';

    if (!userInput) {
      return { chunks: [], totalFound: 0 };
    }

    return this.contextPackService.buildPack({
      companyId: options.companyId,
      query: userInput,
      agentId: options.agentId,
      campaignId: options.campaignId ?? undefined,
      includeBrandBrain: true,
      includeAgentLearning: true,
      includeCampaignContext: !!options.campaignId,
    });
  }

  private async getPreviousStepsOutput(
    runId: string,
  ): Promise<Record<string, Record<string, unknown>>> {
    const steps = await this.prisma.agentRunStep.findMany({
      where: { agentRunId: runId, status: 'COMPLETED' },
      orderBy: { stepIndex: 'asc' },
    });

    const output: Record<string, Record<string, unknown>> = {};
    for (const step of steps) {
      output[step.stepKey] = step.outputPayload as Record<string, unknown>;
    }

    return output;
  }

  private createLlmCompleteFunction(agentId: string) {
    return async (messages: unknown[], options?: unknown) => {
      const response = await this.aiRuntime.complete({
        messages: messages as Parameters<typeof this.aiRuntime.complete>[0]['messages'],
        agentId,
        ...(options as Record<string, unknown>),
      });

      return response;
    };
  }
}
