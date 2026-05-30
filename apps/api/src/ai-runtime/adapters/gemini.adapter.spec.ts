import type {
  AIRuntimeEmbeddingRequest,
  AIRuntimeImageRequest,
  AIRuntimeTextRequest,
} from './ai-provider.adapter';
import { GeminiAdapter } from './gemini.adapter';

describe('GeminiAdapter', () => {
  const adapter = new GeminiAdapter();

  const credential = {
    id: 'env:gemini',
    value: 'test-key',
    scope: 'platform' as const,
  };

  const model = {
    id: 'model-1',
    slug: 'gemini-2-0-flash',
    providerSlug: 'gemini',
    apiModelName: 'gemini-2.0-flash',
  };

  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('supports all declared runtime capabilities', () => {
    expect(adapter.supports('text_generation')).toBe(true);
    expect(adapter.supports('image_generation')).toBe(true);
    expect(adapter.supports('embeddings')).toBe(true);
    expect(adapter.supports('structured_output')).toBe(true);
  });

  it('maps model catalog from listModels', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          {
            name: 'models/gemini-2.0-flash',
            displayName: 'Gemini 2.0 Flash',
            description: 'Fast multimodal model',
            supportedGenerationMethods: ['generateContent', 'embedContent'],
            inputTokenLimit: 1048576,
            outputTokenLimit: 8192,
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await adapter.listModels(credential);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      slug: 'gemini-2-0-flash',
      name: 'Gemini 2.0 Flash',
      externalModelId: 'gemini-2.0-flash',
      status: 'active',
    });
    expect(result[0].capabilityMetadata).toMatchObject({
      text: true,
      embeddings: true,
      vision: true,
    });
  });

  it('generates text with structured output parsing', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: '{"headline":"oi"}' }],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 15,
          totalTokenCount: 25,
        },
      }),
    }) as unknown as typeof fetch;

    const request: AIRuntimeTextRequest = {
      credential,
      model,
      messages: [
        { role: 'system', content: 'You are helpful.' },
        { role: 'user', content: 'Generate a JSON headline.' },
      ],
      structuredOutputSchema: {
        type: 'object',
        properties: {
          headline: { type: 'string' },
        },
      },
    };

    const result = await adapter.generateText(request);

    expect(result.text).toBe('{"headline":"oi"}');
    expect(result.structuredOutput).toEqual({ headline: 'oi' });
    expect(result.usage.totalTokens).toBe(25);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/models/gemini-2.0-flash:generateContent?key=test-key'),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('generates image output as data url', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ inlineData: { mimeType: 'image/png', data: 'abc123' } }],
            },
          },
        ],
      }),
    }) as unknown as typeof fetch;

    const request: AIRuntimeImageRequest = {
      credential,
      model,
      prompt: 'Generate a banner image',
    };

    const result = await adapter.generateImage(request);

    expect(result.images).toEqual([{ url: 'data:image/png;base64,abc123' }]);
    expect(result.usage.imageCount).toBe(1);
  });

  it('creates embeddings from embedContent response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        embedding: {
          values: [0.1, 0.2, 0.3],
        },
      }),
    }) as unknown as typeof fetch;

    const request: AIRuntimeEmbeddingRequest = {
      credential,
      model,
      input: 'vectorize this text',
    };

    const result = await adapter.createEmbedding(request);

    expect(result.embedding).toEqual([0.1, 0.2, 0.3]);
    expect(result.usage.embeddingCount).toBe(1);
  });
});
