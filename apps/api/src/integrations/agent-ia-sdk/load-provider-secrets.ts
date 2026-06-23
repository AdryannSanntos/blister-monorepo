import type { ConfigService } from '@nestjs/config';
import type { ProviderSecrets } from '@company-os/agent-ia-sdk';

/**
 * The ONLY place in `apps/api` that reads provider API keys from the
 * environment. Every other file gets credentials via the wired SDK. Enforced
 * by `scripts/check-ai-boundaries.sh` (Task 15).
 */
export const loadProviderSecrets = (config: ConfigService): ProviderSecrets => ({
  openrouter: {
    apiKey: config.get<string>('OPENROUTER_API_KEY') ?? '',
    baseUrl: config.get<string>('OPENROUTER_BASE_URL'),
    httpReferer: config.get<string>('OPENROUTER_HTTP_REFERER'),
    appTitle: config.get<string>('OPENROUTER_APP_TITLE'),
  },
  gemini: {
    apiKey: config.get<string>('GEMINI_API_KEY') ?? '',
    baseUrl: config.get<string>('GEMINI_BASE_URL'),
  },
  assemblyai: {
    apiKey: config.get<string>('ASSEMBLYAI_API_KEY') ?? '',
    llmGatewayBaseUrl: config.get<string>('ASSEMBLYAI_LLM_GATEWAY_BASE_URL'),
    sttBaseUrl: config.get<string>('ASSEMBLYAI_BASE_URL'),
  },
});
