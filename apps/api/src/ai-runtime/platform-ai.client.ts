import { OpenRouterAdapter } from './adapters/openrouter.adapter';
import { GeminiAdapter } from './adapters/gemini.adapter';
import { AssemblyAiAdapter } from './adapters/assemblyai.adapter';
import type { AiProviderAdapter } from './adapters/ai-provider.adapter';
import type { PrismaClient } from '../generated/prisma';
import {
  RAG_EMBEDDING_DIMENSIONS,
  resolvePlatformCaptionModel,
  resolvePlatformEmbeddingModel,
  type ResolvedPlatformModel,
} from './platform-model-resolver';

class EnvConfigService {
  get<T = string>(key: string, defaultValue?: T): T | undefined {
    return (process.env[key] as T | undefined) ?? defaultValue;
  }
}

const createAdapters = (): Record<string, AiProviderAdapter> => {
  const config = new EnvConfigService();
  return {
    openrouter: new OpenRouterAdapter(config as never),
    gemini: new GeminiAdapter(config as never),
    assemblyai: new AssemblyAiAdapter(config as never),
  };
};

const getAdapter = (
  providerSlug: string,
  adapters: Record<string, AiProviderAdapter>,
): AiProviderAdapter => {
  const adapter = adapters[providerSlug];
  if (!adapter) {
    throw new Error(`Provider not supported for platform AI: ${providerSlug}`);
  }
  return adapter;
};

export type PlatformEmbedResult = {
  embeddings: number[][];
  modelLabel: string;
  dimensions: number;
};

export const embedTextsForPlatform = async (
  prisma: PrismaClient,
  texts: string[],
): Promise<PlatformEmbedResult> => {
  if (texts.length === 0) {
    return { embeddings: [], modelLabel: '', dimensions: RAG_EMBEDDING_DIMENSIONS };
  }

  const resolved = await resolvePlatformEmbeddingModel(prisma);
  const adapters = createAdapters();
  const adapter = getAdapter(resolved.providerSlug, adapters);

  if (!adapter.supports('embeddings')) {
    throw new Error(
      `Configured embedding provider "${resolved.providerSlug}" does not support embeddings.`,
    );
  }

  const result = await adapter.createEmbedding({
    input: texts,
    model: resolved.externalModelId,
    dimensions: RAG_EMBEDDING_DIMENSIONS,
  });

  return {
    embeddings: result.embeddings,
    modelLabel: resolved.modelLabel,
    dimensions: result.dimensions,
  };
};

export type CaptionInput = {
  fileName: string;
  mimeType: string;
  imageBase64?: string;
};

const CAPTION_SYSTEM_PROMPT =
  'You describe files for semantic search in a marketing knowledge base. ' +
  'Reply in Brazilian Portuguese with a concise, factual description (2-4 sentences). ' +
  'Mention visible text, products, colors, mood, and marketing context when relevant. ' +
  'Do not use markdown or bullet lists.';

const buildCaptionUserPrompt = (input: CaptionInput): string => {
  if (input.imageBase64) {
    return `Describe this image file for search indexing.\nFile name: ${input.fileName}\nMIME type: ${input.mimeType}`;
  }

  return (
    `Describe this campaign file for search indexing based on its metadata.\n` +
    `File name: ${input.fileName}\nMIME type: ${input.mimeType}`
  );
};

const captionWithOpenRouter = async (
  model: ResolvedPlatformModel,
  input: CaptionInput,
): Promise<string> => {
  const config = new EnvConfigService();
  const apiKey = config.get<string>('OPENROUTER_API_KEY') ?? '';
  const baseUrl = config.get<string>('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is required for caption generation');
  }

  const userContent: unknown = input.imageBase64
    ? [
        { type: 'text', text: buildCaptionUserPrompt(input) },
        {
          type: 'image_url',
          image_url: {
            url: `data:${input.mimeType};base64,${input.imageBase64}`,
          },
        },
      ]
    : buildCaptionUserPrompt(input);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.get('OPENROUTER_HTTP_REFERER') ?? 'https://blister.app',
      'X-Title': config.get('OPENROUTER_APP_TITLE') ?? 'Blister',
    },
    body: JSON.stringify({
      model: model.externalModelId,
      messages: [
        { role: 'system', content: CAPTION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      max_tokens: 512,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Caption API error (${response.status}): ${error}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content?.trim() ?? '';
};

const captionWithGemini = async (
  model: ResolvedPlatformModel,
  input: CaptionInput,
): Promise<string> => {
  const config = new EnvConfigService();
  const apiKey = config.get<string>('GEMINI_API_KEY') ?? '';
  const baseUrl =
    config.get<string>('GEMINI_BASE_URL') ??
    'https://generativelanguage.googleapis.com/v1beta';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required for caption generation');
  }

  const parts: Array<Record<string, unknown>> = [
    { text: `${CAPTION_SYSTEM_PROMPT}\n\n${buildCaptionUserPrompt(input)}` },
  ];

  if (input.imageBase64) {
    parts.push({
      inlineData: {
        mimeType: input.mimeType,
        data: input.imageBase64,
      },
    });
  }

  const url = `${baseUrl}/models/${model.externalModelId}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        maxOutputTokens: 512,
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini caption error (${response.status}): ${error}`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? '')
    .join('')
    .trim();

  return text ?? '';
};

const captionWithAssemblyAi = async (
  model: ResolvedPlatformModel,
  input: CaptionInput,
): Promise<string> => {
  const config = new EnvConfigService();
  const apiKey = config.get<string>('ASSEMBLYAI_API_KEY') ?? '';
  const baseUrl =
    config.get<string>('ASSEMBLYAI_LLM_GATEWAY_BASE_URL') ??
    'https://llm-gateway.assemblyai.com/v1';

  if (!apiKey) {
    throw new Error('ASSEMBLYAI_API_KEY is required for caption generation');
  }

  const adapters = createAdapters();
  const adapter = getAdapter('assemblyai', adapters);

  const result = await adapter.generateText({
    model: model.externalModelId,
    temperature: 0.3,
    maxTokens: 512,
    messages: [
      { role: 'system', content: CAPTION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: input.imageBase64
          ? `${buildCaptionUserPrompt(input)}\n\n(Image attached — describe based on file name and type if vision is unavailable.)`
          : buildCaptionUserPrompt(input),
      },
    ],
  });

  return result.content.trim();
};

export const generatePlatformCaption = async (
  model: ResolvedPlatformModel,
  input: CaptionInput,
): Promise<string> => {
  switch (model.providerSlug) {
    case 'openrouter':
      return captionWithOpenRouter(model, input);
    case 'gemini':
      return captionWithGemini(model, input);
    case 'assemblyai':
      return captionWithAssemblyAi(model, input);
    default: {
      const adapters = createAdapters();
      const adapter = getAdapter(model.providerSlug, adapters);
      const result = await adapter.generateText({
        model: model.externalModelId,
        temperature: 0.3,
        maxTokens: 512,
        messages: [
          { role: 'system', content: CAPTION_SYSTEM_PROMPT },
          { role: 'user', content: buildCaptionUserPrompt(input) },
        ],
      });
      return result.content.trim();
    }
  }
};

export const generatePlatformCaptionFromSettings = async (
  prisma: PrismaClient,
  input: CaptionInput,
): Promise<string | null> => {
  const model = await resolvePlatformCaptionModel(prisma);
  if (!model) return null;

  const caption = await generatePlatformCaption(model, input);
  return caption.trim() || null;
};
