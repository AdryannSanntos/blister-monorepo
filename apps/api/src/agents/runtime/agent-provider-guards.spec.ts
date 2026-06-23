import {
  assertCutsLiveProviders,
  hasAssemblyAiConfigured,
  hasLlmProviderConfigured,
} from './agent-provider-guards';

describe('agent-provider-guards', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('assertCutsLiveProviders passes when keys are set', () => {
    process.env.ASSEMBLYAI_API_KEY = 'test';
    process.env.OPENROUTER_API_KEY = 'test';
    expect(() => assertCutsLiveProviders('trigger')).not.toThrow();
  });

  it('assertCutsLiveProviders throws when keys are missing', () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(() => assertCutsLiveProviders('trigger')).toThrow(/ASSEMBLYAI_API_KEY/);
  });

  it('hasLlmProviderConfigured detects openrouter or gemini', () => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    expect(hasLlmProviderConfigured()).toBe(false);
    process.env.GEMINI_API_KEY = 'x';
    expect(hasLlmProviderConfigured()).toBe(true);
  });

  it('hasAssemblyAiConfigured detects assembly key', () => {
    delete process.env.ASSEMBLYAI_API_KEY;
    expect(hasAssemblyAiConfigured()).toBe(false);
    process.env.ASSEMBLYAI_API_KEY = 'x';
    expect(hasAssemblyAiConfigured()).toBe(true);
  });
});
