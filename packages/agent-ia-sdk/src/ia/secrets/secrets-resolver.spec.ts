import { describe, expect, it } from 'vitest';
import { ProviderNotConfiguredError } from '../../errors';
import type { ProviderSecrets } from '../../types';
import { resolveProviderSecrets } from './secrets-resolver';

const secrets: ProviderSecrets = {
  openrouter: { apiKey: 'or-key', baseUrl: 'https://openrouter.ai/api/v1' },
  gemini: { apiKey: '' },
};

describe('resolveProviderSecrets', () => {
  it('returns the resolved secret when the apiKey is present', () => {
    const resolved = resolveProviderSecrets(secrets, 'openrouter');
    expect(resolved.apiKey).toBe('or-key');
    expect(resolved.baseUrl).toBe('https://openrouter.ai/api/v1');
  });

  it('throws ProviderNotConfiguredError naming the env var when apiKey is empty', () => {
    expect(() => resolveProviderSecrets(secrets, 'gemini')).toThrowError(
      ProviderNotConfiguredError,
    );
    try {
      resolveProviderSecrets(secrets, 'gemini');
    } catch (err) {
      expect((err as ProviderNotConfiguredError).expectedEnvVar).toBe(
        'GEMINI_API_KEY',
      );
    }
  });

  it('throws ProviderNotConfiguredError when the provider entry is missing', () => {
    expect(() => resolveProviderSecrets(secrets, 'assemblyai')).toThrowError(
      ProviderNotConfiguredError,
    );
  });

  it('throws for an unknown provider slug', () => {
    expect(() => resolveProviderSecrets(secrets, 'cohere')).toThrowError(
      /Unknown provider slug/,
    );
  });
});
