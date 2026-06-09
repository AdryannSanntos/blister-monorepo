import { toUserFacingProviderError } from '../../../ai-runtime/provider-error.util';
import { Prisma, type PrismaClient } from '../../../generated/prisma';
import { loadAgentDefinition } from './agent-loader';
import { debitStepCredits, getPlatformSettings } from './credit-debit.helper';
import { customStepExecutors } from './custom-steps';
import {
  type EventPublisher,
  createOutputChunkEvent,
  createRunCompletedEvent,
  createRunFailedEvent,
  createRunPausedEvent,
  createRunStartedEvent,
  createStepCompletedEvent,
  createStepStartedEvent,
} from './run-event.publisher';
import { type ContextPackBuilder, buildStepContext } from './step-context.builder';
import type {
  AgentDefinition,
  AssetResolver,
  ContextPack,
  RunResult,
  StepExecutionContext,
  StepResult,
} from './types';

export interface LlmCompletion {
  content: string;
  model: string;
  tokensInput: number;
  tokensOutput: number;
  costUsd: number;
  structuredOutput?: Record<string, unknown>;
}

export interface LlmCompletionParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  agentId: string;
  maxTokens?: number;
  temperature?: number;
  structuredOutputSchema?: Record<string, unknown>;
}

export interface LlmProvider {
  complete(params: LlmCompletionParams): Promise<LlmCompletion>;
  /**
   * Optional streaming variant. When present, the kernel uses it for llm_call
   * steps so the UI can render the answer token-by-token. `onChunk` receives
   * incremental text deltas as they arrive from the model.
   */
  completeStream?(
    params: LlmCompletionParams,
    onChunk: (delta: string) => void,
  ): Promise<LlmCompletion>;
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
  /** Resolves brand asset storage keys to signed URLs (optional). */
  assetResolver?: AssetResolver | null;
  stubMode?: boolean;
}

/**
 * Providers handed to a custom (agent-specific) step executor. This is the
 * subset of {@link ExecutionDependencies} a step needs to do real work, without
 * exposing the orchestration plumbing (prisma, event publisher).
 */
export interface StepExecutorDeps {
  llmProvider: LlmProvider | null;
  imageProvider: ImageProvider | null;
  assetResolver: AssetResolver | null;
}

/**
 * An agent-specific step implementation. Registered in `custom-steps.ts` under
 * the key `"<agentId>:<stepKey>"`. When present, the kernel calls it instead of
 * the generic step handler for that step type, giving the agent full control
 * over prompt construction, pausing for user input, and output shaping.
 */
export type CustomStepExecutor = (
  context: StepExecutionContext,
  deps: StepExecutorDeps,
  onChunk?: (delta: string) => void,
) => Promise<StepResult>;

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

  // On resume, persist the answers into inputPayload so multi-step onboarding
  // (one question per pause) accumulates state across pauses. Without this, the
  // formData only lives in-memory for the current resume and earlier answers
  // would be lost on the next pause.
  if (params.formData && Object.keys(params.formData).length > 0) {
    const mergedInput = {
      ...(run.inputPayload as Record<string, unknown>),
      ...params.formData,
    };
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { inputPayload: JSON.parse(JSON.stringify(mergedInput)) },
    });
    run.inputPayload = mergedInput as typeof run.inputPayload;
  }

  await prisma.agentRun.update({
    where: { id: run.id },
    data: {
      status: 'RUNNING',
      startedAt: run.startedAt ?? new Date(),
    },
  });

  await eventPublisher.publish(createRunStartedEvent(run.id, run.agentId, run.companyId));

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
          ...(run.inputPayload as Record<string, unknown>),
          ...currentOutput,
          ...(params.formData ?? {}),
        },
      });

      const onChunk = (delta: string): void => {
        if (!delta) return;
        void eventPublisher.publish(
          createOutputChunkEvent(run.id, run.agentId, run.companyId, delta),
        );
      };

      const stepResult = stubMode
        ? await executeStepStub(stepDef.key, run.agentId)
        : await executeStep(deps, agentDefinition, stepDef.key, stepContext, onChunk);

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
            createRunFailedEvent(
              run.id,
              run.agentId,
              run.companyId,
              debitResult.error ?? 'Unknown',
            ),
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
            run.inputPayload as Record<string, unknown>,
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
  onChunk?: (delta: string) => void,
): Promise<StepResult> {
  const stepDef = agentDef.steps.find((s) => s.key === stepKey);
  if (!stepDef) {
    return { type: 'FAILED', error: `Step not found: ${stepKey}` };
  }

  // Agent-specific override: when an agent registers a custom executor for this
  // step, it takes precedence over the generic per-type handler below.
  const customExecutor = customStepExecutors[`${agentDef.agentId}:${stepKey}`];
  if (customExecutor) {
    return customExecutor(
      context,
      {
        llmProvider: deps.llmProvider,
        imageProvider: deps.imageProvider,
        assetResolver: deps.assetResolver ?? null,
      },
      onChunk,
    );
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

    case 'clarification':
      // A clarification step with no registered custom executor cannot know what
      // to ask, so it is a no-op that lets the run continue.
      return { type: 'CONTINUE', output: {} };

    case 'llm_call':
      if (!deps.llmProvider) {
        return {
          type: 'FAILED',
          error:
            'Nenhum provedor de texto está configurado. Adicione OPENROUTER_API_KEY ou GEMINI_API_KEY no servidor.',
        };
      }
      return executeLlmStep(deps.llmProvider, agentDef, context, onChunk);

    case 'image_generation':
      if (!deps.imageProvider) {
        return {
          type: 'FAILED',
          error:
            'Geração de imagem indisponível. Configure GEMINI_API_KEY e o modelo de imagem do agente.',
        };
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

function parseLlmOutput(response: {
  structuredOutput?: Record<string, unknown>;
  content: string;
}): Record<string, unknown> {
  if (response.structuredOutput) return response.structuredOutput;

  const content = response.content.trim();
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    // Streaming responses can wrap JSON in markdown fences or stray prose.
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>;
      } catch {
        // fall through
      }
    }
    return { text: content };
  }
}

async function executeLlmStep(
  llmProvider: LlmProvider,
  agentDef: AgentDefinition,
  context: StepExecutionContext,
  onChunk?: (delta: string) => void,
): Promise<StepResult> {
  try {
    const systemPrompt = buildSystemPrompt(agentDef, context);
    const userPrompt = buildUserPrompt(context);
    const params = {
      messages: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
      agentId: context.agentId,
      structuredOutputSchema: agentDef.outputSchema,
    };

    const response =
      onChunk && llmProvider.completeStream
        ? await llmProvider.completeStream(params, onChunk)
        : await llmProvider.complete(params);

    return {
      type: 'CONTINUE',
      output: parseLlmOutput(response),
      llmModel: response.model,
      tokensInput: response.tokensInput,
      tokensOutput: response.tokensOutput,
      creditCost: response.costUsd,
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: toUserFacingProviderError(error),
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
      error: toUserFacingProviderError(error),
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

  prompt += describeOutputContract(agentDef.outputSchema);

  return prompt;
}

/**
 * Some providers ignore the `response_format` JSON schema, so we also spell the
 * expected shape out in the prompt. This is what keeps the model from inventing
 * field names like `copy`/`cta` instead of the schema's `caption`/`tone`.
 */
function describeOutputContract(schema: Record<string, unknown>): string {
  const properties =
    schema && typeof schema === 'object'
      ? (schema.properties as Record<string, { type?: string; description?: string }> | undefined)
      : undefined;

  if (!properties || Object.keys(properties).length === 0) {
    return `Responda SEMPRE com um único objeto JSON válido, sem texto fora do JSON.`;
  }

  const required = Array.isArray((schema as { required?: unknown }).required)
    ? ((schema as { required?: string[] }).required ?? [])
    : [];

  const fieldLines = Object.entries(properties)
    .map(([key, def]) => {
      const type = def?.type ?? 'string';
      const req = required.includes(key) ? ' (obrigatório)' : '';
      const desc = def?.description ? ` — ${def.description}` : '';
      return `- "${key}": ${type}${req}${desc}`;
    })
    .join('\n');

  return [
    `## Formato de saída (OBRIGATÓRIO)`,
    `Responda com UM único objeto JSON válido, sem markdown, sem comentários e sem texto fora do JSON.`,
    `Use EXATAMENTE estes campos (não invente outros nomes como "copy" ou "cta"):`,
    fieldLines,
  ].join('\n');
}

function buildUserPrompt(context: StepExecutionContext): string {
  const payload = context.inputPayload as {
    userInput?: string;
    metadata?: {
      conversationHistory?: Array<{
        userInput: string;
        assistantSummary: string;
      }>;
    };
  };

  const userInput = payload.userInput ?? '';
  const history = payload.metadata?.conversationHistory ?? [];

  if (history.length === 0) {
    return userInput;
  }

  const priorTurns = history
    .map(
      (turn, index) =>
        `### Turn ${index + 1}\nUser: ${turn.userInput}\nAssistant: ${turn.assistantSummary}`,
    )
    .join('\n\n');

  return `## Previous conversation\n${priorTurns}\n\n## New message\n${userInput}`;
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
        {
          title: 'Lançamento',
          description: 'Post de divulgação',
          suggestedDate: new Date().toISOString(),
        },
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
