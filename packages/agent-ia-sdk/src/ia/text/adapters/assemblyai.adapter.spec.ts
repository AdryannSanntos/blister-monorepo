import { describe, expect, it } from 'vitest';
import {
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
