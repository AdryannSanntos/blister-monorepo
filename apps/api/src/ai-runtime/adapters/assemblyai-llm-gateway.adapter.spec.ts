import type { AIRuntimeTextRequest } from './ai-provider.adapter';
import { AssemblyAILlmGatewayAdapter } from './assemblyai-llm-gateway.adapter';

describe('AssemblyAILlmGatewayAdapter', () => {
  const adapter = new AssemblyAILlmGatewayAdapter();
  const originalFetch = global.fetch;

  const credential = {
    id: 'env:assemblyai-llm-gateway',
    value: 'assemblyai-key',
    scope: 'platform' as const,
  };

  const model = {
    id: 'model-1',
    slug: 'gemini-2-5-flash-lite',
    providerSlug: 'assemblyai-llm-gateway',
    apiModelName: 'gemini-2.5-flash-lite',
  };

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.ASSEMBLYAI_LLM_GATEWAY_BASE_URL;
    jest.restoreAllMocks();
  });

  it('supports text generation and structured output only', () => {
    expect(adapter.supports('text_generation')).toBe(true);
    expect(adapter.supports('structured_output')).toBe(true);
    expect(adapter.supports('image_generation')).toBe(false);
    expect(adapter.supports('embeddings')).toBe(false);
  });

  it('lists gateway models for the global region', async () => {
    const result = await adapter.listModels(credential);

    expect(result.some((item) => item.externalModelId === 'gemini-2.5-flash-lite')).toBe(true);
    expect(result.some((item) => item.externalModelId === 'gpt-5')).toBe(true);
  });

  it('filters OpenAI models out of the EU region catalog', async () => {
    process.env.ASSEMBLYAI_LLM_GATEWAY_BASE_URL = 'https://llm-gateway.eu.assemblyai.com/v1';

    const result = await adapter.listModels(credential);

    expect(result.some((item) => item.externalModelId === 'gpt-5')).toBe(false);
    expect(result.some((item) => item.externalModelId === 'gemini-2.5-flash-lite')).toBe(true);
  });

  it('generates text via the AssemblyAI LLM Gateway', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"summary":"oi"}' } }],
        usage: { prompt_tokens: 12, completion_tokens: 8, total_tokens: 20 },
      }),
    }) as unknown as typeof fetch;

    const request: AIRuntimeTextRequest = {
      credential,
      model,
      messages: [{ role: 'user', content: 'resuma isso' }],
      structuredOutputSchema: {
        type: 'object',
        properties: { summary: { type: 'string' } },
      },
    };

    const result = await adapter.generateText(request);

    expect(result.text).toBe('{"summary":"oi"}');
    expect(result.structuredOutput).toEqual({ summary: 'oi' });
    expect(global.fetch).toHaveBeenCalledWith(
      'https://llm-gateway.assemblyai.com/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'assemblyai-key' }),
      }),
    );
  });
});
