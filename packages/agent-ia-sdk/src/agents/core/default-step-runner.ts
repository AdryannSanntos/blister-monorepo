import type {
  AgentDefinitionRuntime,
  CustomStepExecutor,
  ExecutionKernelDeps,
  LlmProviderRuntime,
  StepExecutorRuntimeDeps,
} from './agent-runtime-types';
import type { ImageProviderRuntime } from './agent-runtime-types';
import type { StepExecutionContext, StepResult } from './types';

const defaultFormatProviderError = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export async function executeStep(
  deps: ExecutionKernelDeps,
  agentDef: AgentDefinitionRuntime,
  stepKey: string,
  context: StepExecutionContext,
  stepDeps: StepExecutorRuntimeDeps,
  onChunk?: (delta: string) => void,
): Promise<StepResult> {
  const stepDef = agentDef.steps.find((s) => s.key === stepKey);
  if (!stepDef) {
    return { type: 'FAILED', error: `Step not found: ${stepKey}` };
  }

  const customExecutor = deps.customStepExecutors[`${agentDef.agentId}:${stepKey}`];
  if (customExecutor) {
    return customExecutor(context, stepDeps, onChunk);
  }

  const formatError = deps.formatProviderError ?? defaultFormatProviderError;

  switch (stepDef.type) {
    case 'preparation':
      return {
        type: 'CONTINUE',
        output: {
          contextRetrieved: false,
          chunksCount: 0,
        },
      };

    case 'clarification':
      return { type: 'CONTINUE', output: {} };

    case 'llm_call':
      if (!deps.llmProvider) {
        return {
          type: 'FAILED',
          error:
            'Nenhum provedor de texto está configurado. Adicione OPENROUTER_API_KEY ou GEMINI_API_KEY no servidor.',
        };
      }
      return executeLlmStep(deps.llmProvider, agentDef, context, formatError, onChunk);

    case 'image_generation':
      if (!deps.imageProvider) {
        return {
          type: 'FAILED',
          error:
            'Geração de imagem indisponível. Configure GEMINI_API_KEY e o modelo de imagem do agente.',
        };
      }
      return executeImageStep(deps.imageProvider, context, formatError);

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
  llmProvider: LlmProviderRuntime,
  agentDef: AgentDefinitionRuntime,
  context: StepExecutionContext,
  formatError: (error: unknown) => string,
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
      stepKey: context.stepKey,
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
      error: formatError(error),
    };
  }
}

async function executeImageStep(
  imageProvider: ImageProviderRuntime,
  context: StepExecutionContext,
  formatError: (error: unknown) => string,
): Promise<StepResult> {
  try {
    const prompt =
      (context.previousStepsOutput.generate_prompt as { imagePrompt?: string })?.imagePrompt ??
      (context.inputPayload as { userInput?: string }).userInput ??
      '';

    const result = await imageProvider.generateImage({
      prompt,
      agentId: context.agentId,
      stepKey: context.stepKey,
    });

    return {
      type: 'CONTINUE',
      output: {
        imageUrl: result.imageUrl ?? result.base64,
        storageKey: result.storageKey,
        prompt,
      },
      creditCost: 0.01,
    };
  } catch (error) {
    return {
      type: 'FAILED',
      error: formatError(error),
    };
  }
}

function buildSystemPrompt(
  agentDef: AgentDefinitionRuntime,
  _context: StepExecutionContext,
): string {
  let prompt = `Você é um assistente especializado em ${agentDef.description}.\n\n`;

  prompt += describeOutputContract(agentDef.outputSchema);

  return prompt;
}

function describeOutputContract(schema: Record<string, unknown>): string {
  const properties =
    schema && typeof schema === 'object'
      ? (schema.properties as Record<string, { type?: string; description?: string }> | undefined)
      : undefined;

  if (!properties || Object.keys(properties).length === 0) {
    return 'Responda SEMPRE com um único objeto JSON válido, sem texto fora do JSON.';
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
    '## Formato de saída (OBRIGATÓRIO)',
    'Responda com UM único objeto JSON válido, sem markdown, sem comentários e sem texto fora do JSON.',
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

export async function executeStepStub(stepKey: string, agentId: string): Promise<StepResult> {
  await new Promise((resolve) => setTimeout(resolve, 50));

  if (agentId === 'cuts') {
    const cutsStubByStep: Record<string, Record<string, unknown>> = {
      retrieve_context: {},
      resolve_source: {
        sourceFileId: 'stub-file',
        sourceFileName: 'stub.mp4',
        transcriptText: 'Welcome to the show. Today we discuss retention hooks.',
        segments: [
          { startSec: 0, endSec: 45, text: 'Welcome to the show.' },
          { startSec: 45, endSec: 120, text: 'Today we discuss retention hooks.' },
        ],
        analyzedSegments: [
          { id: 'seg-1', startSec: 0, endSec: 45, text: 'Welcome to the show.', wordCount: 4 },
          {
            id: 'seg-2',
            startSec: 45,
            endSec: 120,
            text: 'Today we discuss retention hooks.',
            wordCount: 5,
          },
        ],
      },
      rank_segments: {
        cuts: [
          {
            id: 'cut-1',
            title: 'Retention hook',
            description: 'Opens with a strong question',
            startSec: 45,
            endSec: 105,
            durationSec: 60,
            viralScore: 91,
            reviewStatus: 'approved',
          },
        ],
        sourceFileId: 'stub-file',
      },
      await_cut_review: {
        cuts: [
          {
            id: 'cut-1',
            title: 'Retention hook',
            description: 'Opens with a strong question',
            startSec: 45,
            endSec: 105,
            durationSec: 60,
            viralScore: 91,
            reviewStatus: 'approved',
          },
        ],
        sourceFileId: 'stub-file',
      },
      validate_output: {},
      finalize_cuts: {
        cuts: [
          {
            id: 'cut-1',
            title: 'Retention hook',
            description: 'Opens with a strong question',
            startSec: 45,
            endSec: 105,
            durationSec: 60,
            viralScore: 91,
            reviewStatus: 'approved',
          },
        ],
        sourceFileId: 'stub-file',
      },
      cleanup_source: { deleted: false },
    };

    return {
      type: 'CONTINUE',
      output: cutsStubByStep[stepKey] ?? { stepKey },
      llmModel: stepKey === 'rank_segments' ? 'stub/cuts' : undefined,
      tokensInput: stepKey === 'rank_segments' ? 100 : 0,
      tokensOutput: stepKey === 'rank_segments' ? 50 : 0,
      creditCost: stepKey === 'rank_segments' ? 0 : 0,
    };
  }

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
    creditCost: 0,
  };
}

export type { CustomStepExecutor, StepExecutorRuntimeDeps };
