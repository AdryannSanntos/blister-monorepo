import type {
  AiProviderAdapter,
  AiRuntimeTextResult,
} from '../../../ai-runtime/adapters/ai-provider.adapter';
import { AssemblyAiAdapter } from '../../../ai-runtime/adapters/assemblyai.adapter';
import { GeminiAdapter } from '../../../ai-runtime/adapters/gemini.adapter';
import { OpenRouterAdapter } from '../../../ai-runtime/adapters/openrouter.adapter';
import { toUserFacingProviderError } from '../../../ai-runtime/provider-error.util';
import {
  calculateModelCost,
  resolveStepModel,
} from '../../../ai-runtime/resolve-model';
import type { PrismaClient } from '../../../generated/prisma';
import type { LlmProvider } from './agent-execution.kernel';

class EnvConfigService {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    return (process.env[key] as T | undefined) ?? defaultValue;
  }
}

const getAdapter = (
  providerSlug: string,
  adapters: Record<string, AiProviderAdapter>,
): AiProviderAdapter => {
  const adapter = adapters[providerSlug];
  if (!adapter) {
    throw new Error(`Provider not supported in trigger runtime: ${providerSlug}`);
  }
  return adapter;
};

export const createTriggerLlmProvider = (prisma: PrismaClient): LlmProvider => {
  const config = new EnvConfigService();
  const adapters: Record<string, AiProviderAdapter> = {
    openrouter: new OpenRouterAdapter(config as never),
    gemini: new GeminiAdapter(config as never),
    assemblyai: new AssemblyAiAdapter(config as never),
  };

  return {
    async complete(params) {
      const model = await resolveStepModel(prisma, {
        agentId: params.agentId,
        stepKey: params.stepKey,
        requiredCapabilities: ['text', 'structured_output'],
      });
      const adapter = getAdapter(model.providerSlug, adapters);

      try {
        const result = await adapter.generateText({
          messages: params.messages,
          model: model.externalModelId,
          maxTokens: params.maxTokens,
          temperature: params.temperature,
          structuredOutputSchema: params.structuredOutputSchema,
        });

        return {
          content: result.content,
          model: model.modelLabel,
          tokensInput: result.usage.promptTokens,
          tokensOutput: result.usage.completionTokens,
          costUsd: calculateModelCost(
            model,
            result.usage.promptTokens,
            result.usage.completionTokens,
          ),
          structuredOutput: result.structuredOutput,
        };
      } catch (error) {
        throw new Error(toUserFacingProviderError(error));
      }
    },

    async completeStream(params, onChunk) {
      const model = await resolveStepModel(prisma, {
        agentId: params.agentId,
        stepKey: params.stepKey,
        requiredCapabilities: ['text', 'structured_output'],
      });
      const adapter = getAdapter(model.providerSlug, adapters);

      // Providers without streaming support fall back to a single completion.
      if (!adapter.streamText) {
        return this.complete(params);
      }

      // Batch deltas so we emit fewer, slightly larger chunks — smoother to
      // render and far cheaper when events cross the network (trigger mode).
      let buffer = '';
      const flush = () => {
        if (buffer) {
          onChunk(buffer);
          buffer = '';
        }
      };

      try {
        const iterator = adapter.streamText({
          messages: params.messages,
          model: model.externalModelId,
          maxTokens: params.maxTokens,
          temperature: params.temperature,
          structuredOutputSchema: params.structuredOutputSchema,
        });

        let result: AiRuntimeTextResult | undefined;
        while (true) {
          const next = await iterator.next();
          if (next.done) {
            result = next.value;
            break;
          }
          if (next.value.content) {
            buffer += next.value.content;
            if (buffer.length >= 24) flush();
          }
        }
        flush();

        if (!result) {
          throw new Error('Stream ended without a final result');
        }

        return {
          content: result.content,
          model: model.modelLabel,
          tokensInput: result.usage.promptTokens,
          tokensOutput: result.usage.completionTokens,
          costUsd: calculateModelCost(
            model,
            result.usage.promptTokens,
            result.usage.completionTokens,
          ),
          structuredOutput: result.structuredOutput,
        };
      } catch (error) {
        throw new Error(toUserFacingProviderError(error));
      }
    },
  };
};
