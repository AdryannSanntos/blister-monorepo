import { Prisma, type PrismaClient } from '../../../generated/prisma';
import type {
  AgentDefinition,
  ContextPack,
  RunResult,
  StepExecutionContext,
  StepResult,
} from './types';
import { loadAgentDefinition } from './agent-loader';
import { buildStepContext, type ContextPackBuilder } from './step-context.builder';
import { debitStepCredits, getPlatformSettings } from './credit-debit.helper';
import {
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPausedEvent,
  createRunStartedEvent,
  createStepCompletedEvent,
  createStepStartedEvent,
  type EventPublisher,
} from './run-event.publisher';

export interface LlmProvider {
  complete(params: {
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    agentId: string;
    maxTokens?: number;
    temperature?: number;
    structuredOutputSchema?: Record<string, unknown>;
  }): Promise<{
    content: string;
    model: string;
    tokensInput: number;
    tokensOutput: number;
    costUsd: number;
    structuredOutput?: Record<string, unknown>;
  }>;
}

export interface ImageProvider {
  generateImage(params: {
    prompt: string;
    agentId: string;
  }): Promise<{
    imageUrl?: string;
    base64?: string;
    storageKey?: string;
  }>;
}

export interface ExecutionDependencies {
  prisma: PrismaClient;
  contextPackBuilder: ContextPackBuilder | null;
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  eventPublisher: EventPublisher;
  stubMode?: boolean;
}

export interface ExecuteRunParams {
  runId: string;
  resumeFromStep?: string;
  formData?: Record<string, unknown>;
}

export async function executeRun(
  deps: ExecutionDependencies,
  params: ExecuteRunParams,
): Promise<RunResult> {
  const { prisma, eventPublisher, stubMode } = deps;

  const run = await prisma.agentRun.findUnique({
    where: { id: params.runId },
    include: {
      steps: { orderBy: { stepIndex: 'asc' } },
      company: { include: { brandProfile: true } },
    },
  });

  if (!run) {
    throw new Error(`Agent run not found: ${params.runId}`);
  }

  if (['COMPLETED', 'FAILED', 'CANCELLED'].includes(run.status)) {
    return {
      runId: run.id,
      status: run.status as RunResult['status'],
      outputPayload: run.outputPayload as Record<string, unknown>,
      errorMessage: run.errorMessage ?? undefined,
      creditCost: Number(run.creditCost),
    };
  }

  const agentDefinition = await loadAgentDefinition(prisma, run.agentId);
  if (!agentDefinition) {
    throw new Error(`Agent definition not found: ${run.agentId}`);
  }

  await prisma.agentRun.update({
    where: { id: run.id },
    data: {
      status: 'RUNNING',
      startedAt: run.startedAt ?? new Date(),
    },
  });

  await eventPublisher.publish(
    createRunStartedEvent(run.id, run.agentId, run.companyId),
  );

  const platformSettings = await getPlatformSettings(prisma);

  try {
    const startStepIndex = params.resumeFromStep
      ? agentDefinition.steps.findIndex((s) => s.key === params.resumeFromStep)
      : 0;

    let currentOutput: Record<string, unknown> = {};
    let totalCreditCost = 0;

    for (let i = startStepIndex; i < agentDefinition.steps.length; i++) {
      const stepDef = agentDefinition.steps[i];

      await prisma.agentRun.update({
        where: { id: run.id },
        data: { currentStepKey: stepDef.key },
      });

      const existingStep = run.steps.find((s) => s.stepKey === stepDef.key);
      const stepRecord = existingStep
        ? await prisma.agentRunStep.update({
            where: { id: existingStep.id },
            data: { status: 'RUNNING', startedAt: new Date() },
          })
        : await prisma.agentRunStep.create({
            data: {
              agentRunId: run.id,
              stepKey: stepDef.key,
              stepIndex: i,
              status: 'RUNNING',
              startedAt: new Date(),
              inputPayload: JSON.parse(
                JSON.stringify({ ...currentOutput, ...(params.formData ?? {}) }),
              ),
            },
          });

      await eventPublisher.publish(
        createStepStartedEvent(run.id, run.agentId, run.companyId, stepDef.key, i),
      );

      const stepContext = await buildStepContext(prisma, deps.contextPackBuilder, {
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        campaignId: run.campaignId,
        stepKey: stepDef.key,
        stepIndex: i,
        inputPayload: {
          ...run.inputPayload as Record<string, unknown>,
          ...currentOutput,
          ...(params.formData ?? {}),
        },
      });

      const stepResult = stubMode
        ? await executeStepStub(stepDef.key, run.agentId)
        : await executeStep(deps, agentDefinition, stepDef.key, stepContext);

      let stepCreditCost = 0;
      if (stepResult.creditCost && stepResult.creditCost > 0) {
        const debitResult = await debitStepCredits(prisma, {
          companyId: run.companyId,
          agentRunId: run.id,
          agentRunStepId: stepRecord.id,
          stepKey: stepDef.key,
          baseCost: stepResult.creditCost,
          markupMultiplier: platformSettings.markupDefault,
        });

        if (!debitResult.success) {
          await prisma.agentRunStep.update({
            where: { id: stepRecord.id },
            data: {
              status: 'FAILED',
              errorMessage: debitResult.error,
              completedAt: new Date(),
            },
          });

          await prisma.agentRun.update({
            where: { id: run.id },
            data: {
              status: 'FAILED',
              errorMessage: `Insufficient credit balance: ${debitResult.error}`,
              creditCost: new Prisma.Decimal(totalCreditCost),
              completedAt: new Date(),
            },
          });

          await eventPublisher.publish(
            createRunFailedEvent(run.id, run.agentId, run.companyId, debitResult.error ?? 'Unknown'),
          );

          return {
            runId: run.id,
            status: 'FAILED',
            errorMessage: debitResult.error,
            creditCost: totalCreditCost,
          };
        }

        stepCreditCost = debitResult.debitedAmount;
        totalCreditCost += stepCreditCost;
      }

      await prisma.agentRunStep.update({
        where: { id: stepRecord.id },
        data: {
          status: stepResult.type === 'FAILED' ? 'FAILED' : 'COMPLETED',
          resultType: stepResult.type,
          outputPayload: JSON.parse(JSON.stringify(stepResult.output ?? {})),
          errorMessage: stepResult.error,
          llmModel: stepResult.llmModel,
          tokensInput: stepResult.tokensInput,
          tokensOutput: stepResult.tokensOutput,
          creditCost: new Prisma.Decimal(stepCreditCost),
          completedAt: new Date(),
        },
      });

      await eventPublisher.publish(
        createStepCompletedEvent(
          run.id,
          run.agentId,
          run.companyId,
          stepDef.key,
          i,
          stepResult.output ?? {},
          stepCreditCost,
        ),
      );

      if (stepResult.type === 'PAUSED') {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: 'PAUSED',
            pauseReason: stepResult.pauseReason,
            pauseFormSchema: stepResult.pauseFormSchema
              ? JSON.parse(JSON.stringify(stepResult.pauseFormSchema))
              : undefined,
            creditCost: new Prisma.Decimal(totalCreditCost),
          },
        });

        await eventPublisher.publish(
          createRunPausedEvent(
            run.id,
            run.agentId,
            run.companyId,
            stepResult.pauseReason ?? 'Unknown',
            stepResult.pauseFormSchema,
          ),
        );

        return {
          runId: run.id,
          status: 'PAUSED',
          pauseReason: stepResult.pauseReason,
          creditCost: totalCreditCost,
        };
      }

      if (stepResult.type === 'FAILED') {
        await prisma.agentRun.update({
          where: { id: run.id },
          data: {
            status: 'FAILED',
            errorMessage: stepResult.error,
            creditCost: new Prisma.Decimal(totalCreditCost),
            completedAt: new Date(),
          },
        });

        await eventPublisher.publish(
          createRunFailedEvent(run.id, run.agentId, run.companyId, stepResult.error ?? 'Unknown'),
        );

        return {
          runId: run.id,
          status: 'FAILED',
          errorMessage: stepResult.error,
          creditCost: totalCreditCost,
        };
      }

      if (stepResult.output) {
        currentOutput = { ...currentOutput, ...stepResult.output };
      }
    }

    currentOutput.reviewStatus = 'PENDING';

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        outputPayload: JSON.parse(JSON.stringify(currentOutput)),
        creditCost: new Prisma.Decimal(totalCreditCost),
        completedAt: new Date(),
      },
    });

    await eventPublisher.publish(
      createRunCompletedEvent(run.id, run.agentId, run.companyId, currentOutput, totalCreditCost),
    );

    return {
      runId: run.id,
      status: 'COMPLETED',
      outputPayload: currentOutput,
      creditCost: totalCreditCost,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'FAILED',
        errorMessage,
        completedAt: new Date(),
      },
    });

    await eventPublisher.publish(
      createRunFailedEvent(run.id, run.agentId, run.companyId, errorMessage),
    );

    return {
      runId: run.id,
      status: 'FAILED',
      errorMessage,
      creditCost: 0,
    };
  }
}

async function executeStep(
  deps: ExecutionDependencies,
  agentDef: AgentDefinition,
  stepKey: string,
  context: StepExecutionContext,
): Promise<StepResult> {
  const stepDef = agentDef.steps.find((s) => s.key === stepKey);
  if (!stepDef) {
    return { type: 'FAILED', error: `Step not found: ${stepKey}` };
  }

  switch (stepDef.type) {
    case 'preparation':
      return {
        type: 'CONTINUE',
        output: {
          contextRetrieved: true,
          chunksCount: context.contextPack.chunks.length,
        },
      };

    case 'llm_call':
      if (!deps.llmProvider) {
        return { type: 'FAILED', error: 'LLM provider not configured' };
      }
      return executeLlmStep(deps.llmProvider, agentDef, context);

    case 'image_generation':
      if (!deps.imageProvider) {
        return { type: 'FAILED', error: 'Image provider not configured' };
      }
      return executeImageStep(deps.imageProvider, context);

    case 'validation':
      return {
        type: 'CONTINUE',
        output: { validated: true },
      };

    case 'output':
      return {
        type: 'COMPLETE',
        output: context.previousStepsOutput,
      };

    default:
      return { type: 'FAILED', error: `Unknown step type: ${stepDef.type}` };
  }
}

async function executeLlmStep(
  llmProvider: LlmProvider,
  agentDef: AgentDefinition,
  context: StepExecutionContext,
): Promise<StepResult> {
  try {
    const systemPrompt = buildSystemPrompt(agentDef, context);
    const userPrompt = buildUserPrompt(context);

    const response = await llmProvider.complete({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      agentId: context.agentId,
      structuredOutputSchema: agentDef.outputSchema,
    });

    return {
      type: 'CONTINUE',
      output: response.structuredOutput ?? JSON.parse(response.content),
      llmModel: response.model,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      creditCost: response.costUsd,
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: error instanceof Error ? error.message : 'LLM call failed',
    };
  }
}

async function executeImageStep(
  imageProvider: ImageProvider,
  context: StepExecutionContext,
): Promise<StepResult> {
  try {
    const prompt =
      (context.previousStepsOutput.generate_prompt as { imagePrompt?: string })?.imagePrompt ??
      (context.inputPayload as { userInput?: string }).userInput ??
      '';

    const result = await imageProvider.generateImage({
      prompt,
      agentId: context.agentId,
    });

    return {
      type: 'CONTINUE',
      output: {
        imageUrl: result.imageUrl ?? result.base64,
        storageKey: result.storageKey,
        prompt,
      },
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: error instanceof Error ? error.message : 'Image generation failed',
    };
  }
}

function buildSystemPrompt(agentDef: AgentDefinition, context: StepExecutionContext): string {
  let prompt = `Você é um assistente especializado em ${agentDef.description}.\n\n`;

  if (context.brandProfile) {
    prompt += `## Perfil da Marca\n`;
    if (context.brandProfile.brandVoice) {
      prompt += `Tom de voz: ${context.brandProfile.brandVoice}\n`;
    }
    if (context.brandProfile.niche) {
      prompt += `Nicho: ${context.brandProfile.niche}\n`;
    }
    if (context.brandProfile.targetAudience) {
      prompt += `Público-alvo: ${context.brandProfile.targetAudience}\n`;
    }
    prompt += '\n';
  }

  if (context.contextPack.chunks.length > 0) {
    prompt += `## Contexto Relevante\n`;
    for (const chunk of context.contextPack.chunks.slice(0, 5)) {
      prompt += `${chunk.content}\n\n`;
    }
  }

  prompt += `Responda sempre em formato JSON seguindo o schema de saída do agente.`;

  return prompt;
}

function buildUserPrompt(context: StepExecutionContext): string {
  return (context.inputPayload as { userInput?: string }).userInput ?? '';
}

async function executeStepStub(stepKey: string, agentId: string): Promise<StepResult> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  const stubOutputs: Record<string, Record<string, unknown>> = {
    copywriter: {
      caption: 'Descubra o sabor irresistível do nosso novo produto! 🎉',
      hashtags: ['#novidade', '#qualidade', '#marketing'],
      tone: 'enthusiastic',
    },
    strategist: {
      topics: [
        { title: 'Lançamento', description: 'Post de divulgação', suggestedDate: new Date().toISOString() },
      ],
      calendar: { weeklyPosts: 3, bestTimes: ['09:00', '18:00'] },
      recommendations: 'Focus on visual content.',
    },
    designer: {
      imagePrompt: 'Modern product showcase',
      style: 'minimalist',
      imageUrl: 'stub://image.png',
      storageKey: 'stub/image.png',
    },
  };

  const output = stubOutputs[agentId] ?? { result: 'stub', stepKey };

  return {
    type: 'CONTINUE',
    output,
    llmModel: `stub/${agentId}`,
    tokensInput: 100,
    tokensOutput: 50,
    creditCost: 0.0001,
  };
}
