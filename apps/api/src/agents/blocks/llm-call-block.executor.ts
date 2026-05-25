import type { BlockExecutorFn } from '../agent-block-executor.registry';

interface GenerateTextResult {
  text: string;
  providerId: string;
  modelId: string;
  usage: unknown;
}

interface AIRuntimeServiceLike {
  generateText: (params: {
    organizationId?: string;
    providerId?: string;
    modelId?: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  }) => Promise<GenerateTextResult>;
}

export function createLlmCallExecutor(aiRuntimeService: AIRuntimeServiceLike): BlockExecutorFn {
  return async (ctx) => {
    const systemPrompt =
      typeof ctx.blockConfig.prompt === 'string' ? ctx.blockConfig.prompt : '';
    const modelId =
      typeof ctx.blockConfig.modelId === 'string' ? ctx.blockConfig.modelId : undefined;
    const providerId =
      typeof ctx.blockConfig.providerId === 'string' ? ctx.blockConfig.providerId : undefined;

    const payload = ctx.inputs.payload ?? ctx.inputs.default ?? ctx.inputs;
    const userMessage =
      typeof payload === 'string' ? payload : JSON.stringify(payload ?? '');

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: userMessage });

    const result = await aiRuntimeService.generateText({
      organizationId: ctx.organizationId,
      providerId,
      modelId,
      messages,
    });

    return {
      outputs: {
        text: result.text,
        default: result.text,
        __usage: {
          providerId: result.providerId,
          modelId: result.modelId,
          usage: result.usage,
        },
      },
    };
  };
}
