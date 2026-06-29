import { describe, expect, it, vi } from 'vitest';
import { ProviderExecutionError } from '../../../errors';
import {
  AssemblyAiTextAdapter,
  assemblyAiModelSupportsTemperature,
  assemblyAiModelUsesPromptJson,
} from './assemblyai.adapter';

describe('assemblyAiModelUsesPromptJson', () => {
  it('uses prompt JSON for Claude models', () => {
    expect(assemblyAiModelUsesPromptJson('claude-opus-4-7')).toBe(true);
    expect(assemblyAiModelUsesPromptJson('claude-sonnet-4-5-20250929')).toBe(true);
    expect(assemblyAiModelUsesPromptJson('anthropic/claude-sonnet-4-6')).toBe(true);
  });

  it('uses prompt JSON for gpt-oss models', () => {
    expect(assemblyAiModelUsesPromptJson('gpt-oss-120b')).toBe(true);
    expect(assemblyAiModelUsesPromptJson('gpt-oss-20b')).toBe(true);
  });

  it('allows native json_schema for GPT and Gemini models', () => {
    expect(assemblyAiModelUsesPromptJson('gpt-5-mini')).toBe(false);
    expect(assemblyAiModelUsesPromptJson('gemini-2.5-flash')).toBe(false);
    expect(assemblyAiModelUsesPromptJson('kimi-k2.5')).toBe(false);
  });
});

describe('assemblyAiModelSupportsTemperature', () => {
  it('omits temperature for Anthropic reasoning models', () => {
    expect(assemblyAiModelSupportsTemperature('claude-opus-4-7')).toBe(false);
    expect(assemblyAiModelSupportsTemperature('claude-opus-4-6')).toBe(false);
    expect(assemblyAiModelSupportsTemperature('claude-sonnet-4-6')).toBe(false);
    expect(assemblyAiModelSupportsTemperature('anthropic/claude-sonnet-4-6')).toBe(
      false,
    );
  });

  it('keeps temperature for other gateway models', () => {
    expect(assemblyAiModelSupportsTemperature('claude-sonnet-4-5-20250929')).toBe(
      true,
    );
    expect(assemblyAiModelSupportsTemperature('gpt-5-mini')).toBe(true);
    expect(assemblyAiModelSupportsTemperature('gemini-2.5-flash')).toBe(true);
  });
});

describe('AssemblyAiTextAdapter.complete', () => {
  it('throws a provider error when choices is null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new AssemblyAiTextAdapter({ apiKey: 'test-key' });

    await expect(
      adapter.complete({
        model: 'gpt-5-mini',
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    ).rejects.toMatchObject({
      provider: 'assemblyai',
      category: 'validation',
      message: 'LLM Gateway returned no completion choices',
      statusCode: 502,
    } satisfies Partial<ProviderExecutionError>);

    vi.unstubAllGlobals();
  });

  it('returns content from the first choice', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const adapter = new AssemblyAiTextAdapter({ apiKey: 'test-key' });
    const result = await adapter.complete({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: 'Hello' }],
    });

    expect(result.content).toBe('{"ok":true}');
    expect(result.usage.totalTokens).toBe(15);

    vi.unstubAllGlobals();
  });
});
