import type { AgentExecutionMode } from './agent-execution-mode';

export const hasLlmProviderConfigured = (): boolean =>
  Boolean(process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY);

export const hasAssemblyAiConfigured = (): boolean =>
  Boolean(process.env.ASSEMBLYAI_API_KEY);

/** Cuts needs STT (AssemblyAI) and an LLM provider for rank_segments. */
export const assertCutsLiveProviders = (_mode: AgentExecutionMode): void => {
  const missing: string[] = [];
  if (!hasAssemblyAiConfigured()) missing.push('ASSEMBLYAI_API_KEY');
  if (!hasLlmProviderConfigured()) missing.push('OPENROUTER_API_KEY or GEMINI_API_KEY');

  if (missing.length > 0) {
    throw new Error(`Cuts agent requires configured providers: ${missing.join(', ')}`);
  }
};

export const warnTriggerAppUrl = (
  mode: AgentExecutionMode,
  appUrl: string | undefined,
  apiPort: string | number,
  log: (message: string) => void,
): void => {
  if (!appUrl?.trim()) {
    log(
      'APP_URL is not set — Trigger.dev workers cannot POST run events to the API (UI will appear frozen). Set APP_URL to the API base URL (e.g. http://localhost:3001).',
    );
    return;
  }

  const port = String(apiPort);
  if (appUrl.includes('localhost') && !appUrl.includes(`:${port}`)) {
    log(
      `APP_URL (${appUrl}) does not match API PORT (${port}). Internal event callbacks may fail — set APP_URL to http://localhost:${port}.`,
    );
  }
};

export const warnApiBaseUrl = (
  _mode: AgentExecutionMode,
  apiBaseUrl: string | undefined,
  apiPort: string | number,
  log: (message: string) => void,
): void => {
  if (!apiBaseUrl?.trim()) {
    log(
      'API_BASE_URL is not set — cut render callbacks from Trigger.dev will not reach the API. Set API_BASE_URL to the API base URL (e.g. http://localhost:3001).',
    );
    return;
  }

  const port = String(apiPort);
  if (apiBaseUrl.includes('localhost') && !apiBaseUrl.includes(`:${port}`)) {
    log(
      `API_BASE_URL (${apiBaseUrl}) does not match API PORT (${port}). Render callbacks may fail.`,
    );
  }
};
