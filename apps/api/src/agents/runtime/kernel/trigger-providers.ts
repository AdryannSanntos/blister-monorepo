import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
import type { ImageProvider, LlmProvider } from './agent-execution.kernel';
import type { AssetResolver } from './types';

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

/**
 * Standalone S3-backed asset resolver for the Trigger.dev worker, which runs
 * outside the Nest DI container (no StorageService available). Mirrors
 * StorageService config. Returns null when S3 is not configured so the post
 * generator degrades gracefully.
 */
export const createTriggerAssetResolver = (): AssetResolver | null => {
  const bucket = process.env.AWS_S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  const endpoint = process.env.AWS_S3_ENDPOINT;
  const forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';

  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint ? { endpoint, forcePathStyle } : {}),
  });

  return async (storageKeys) => {
    const entries = await Promise.all(
      storageKeys.map(async (key): Promise<[string, string] | null> => {
        try {
          const url = await getSignedUrl(
            client,
            new GetObjectCommand({ Bucket: bucket, Key: key }),
            { expiresIn: 3600 },
          );
          return [key, url];
        } catch {
          return null;
        }
      }),
    );

    return Object.fromEntries(entries.filter((entry): entry is [string, string] => entry !== null));
  };
};

export const createTriggerImageProvider = (prisma: PrismaClient): ImageProvider => {
  const config = new EnvConfigService();
  const gemini = new GeminiAdapter(config as never);

  return {
    async generateImage(params) {
      const model = await resolveStepModel(prisma, {
        agentId: params.agentId,
        stepKey: params.stepKey,
        requiredCapabilities: ['image'],
      });

      if (model.providerSlug !== 'gemini' || !gemini.generateImage) {
        throw new Error(
          'Geração de imagem requer o provedor Google Gemini configurado para este agente.',
        );
      }

      try {
        const result = await gemini.generateImage({
          prompt: params.prompt,
          model: model.externalModelId,
        });

        const image = result.images[0];
        if (!image) {
          throw new Error('O provedor não retornou nenhuma imagem.');
        }

        return {
          imageUrl:
            image.url ?? (image.base64 ? `data:image/png;base64,${image.base64}` : undefined),
          base64: image.base64,
        };
      } catch (error) {
        throw new Error(toUserFacingProviderError(error));
      }
    },
  };
};
