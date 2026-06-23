/**
 * Top-level types for @company-os/agent-ia-sdk.
 *
 * `ProviderSecrets` is the only shape the backend shell injects into the SDK —
 * credentials live in the environment, never in Postgres. The backend reads
 * them in `integrations/agent-ia-sdk/load-provider-secrets.ts` (the single
 * env reader) and hands them to `createAgentIaSdk`.
 */

export interface OpenRouterSecrets {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
}

export interface GeminiSecrets {
  apiKey: string;
  baseUrl?: string;
}

export interface AssemblyAiSecrets {
  apiKey: string;
  /** Base URL for AssemblyAI's LLM gateway (LeMUR-style text endpoints). */
  llmGatewayBaseUrl?: string;
  /** Base URL for the speech-to-text endpoints. */
  sttBaseUrl?: string;
}

/** Slug-keyed credentials for every supported provider. All optional. */
export interface ProviderSecrets {
  openrouter?: OpenRouterSecrets;
  gemini?: GeminiSecrets;
  assemblyai?: AssemblyAiSecrets;
}

/** Known provider slugs the SDK can resolve secrets for. */
export type ProviderSlug = keyof ProviderSecrets;

/** Resolved credentials for a single provider (the common subset). */
export interface ResolvedProviderSecret {
  apiKey: string;
  baseUrl?: string;
  httpReferer?: string;
  appTitle?: string;
  llmGatewayBaseUrl?: string;
  sttBaseUrl?: string;
}
