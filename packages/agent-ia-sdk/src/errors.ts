/**
 * Errors raised across the @company-os/agent-ia-sdk `ia/` capabilities.
 *
 * These are framework-level errors — the backend shell translates them into
 * HTTP responses; the SDK never imports NestJS or HTTP concerns.
 */

/** Base class so callers can `instanceof AgentIaSdkError` to catch any SDK error. */
export class AgentIaSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * A provider was selected (via a model in the catalog) but no credentials were
 * configured in the environment for its slug.
 */
export class ProviderNotConfiguredError extends AgentIaSdkError {
  constructor(
    public readonly providerSlug: string,
    public readonly expectedEnvVar: string,
  ) {
    super(
      `Provider "${providerSlug}" is not configured. Set ${expectedEnvVar} in the environment.`,
    );
  }
}

/** A model id was referenced but not found (or not enabled) in the AiModel catalog. */
export class ModelNotFoundError extends AgentIaSdkError {
  constructor(public readonly modelId: string) {
    super(`Model "${modelId}" was not found in the catalog or is disabled.`);
  }
}

/**
 * A capability (text, transcription, image, embedding) was requested but no
 * adapter is wired for the resolved provider/model.
 */
export class CapabilityNotConfiguredError extends AgentIaSdkError {
  constructor(
    public readonly capability: string,
    public readonly providerSlug?: string,
  ) {
    super(
      providerSlug
        ? `No "${capability}" adapter is configured for provider "${providerSlug}".`
        : `No "${capability}" adapter is configured.`,
    );
  }
}

/** The platform RAG settings have no embedding model selected. */
export class EmbeddingModelNotConfiguredError extends AgentIaSdkError {
  constructor() {
    super(
      'No embedding model is configured in the platform RAG settings. ' +
        'An admin must select one in "IA do sistema".',
    );
  }
}

/** Coarse classification of a provider HTTP failure. */
export type ProviderErrorCategory =
  | 'auth'
  | 'rate_limit'
  | 'validation'
  | 'unknown';

/**
 * A provider returned an error (HTTP non-2xx) or the request failed at runtime.
 * Shared across `ia/` capabilities so text/embedding/transcription adapters all
 * raise a uniform error the backend shell can translate to a user-facing message.
 */
export class ProviderExecutionError extends AgentIaSdkError {
  constructor(
    public readonly provider: string,
    public readonly category: ProviderErrorCategory,
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message);
  }
}

/** Maps an HTTP status to a coarse provider-error category. */
export const mapProviderErrorCategory = (
  status: number,
): ProviderErrorCategory => {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 400 && status < 500) return 'validation';
  return 'unknown';
};

/** Builds a `ProviderExecutionError` from a failed HTTP response. */
export const parseProviderError = (
  provider: string,
  status: number,
  body: string,
): ProviderExecutionError =>
  new ProviderExecutionError(
    provider,
    mapProviderErrorCategory(status),
    body,
    status,
  );

/** True when retrying the request could plausibly succeed (429 / 5xx). */
export const isRetryable = (error: unknown): boolean => {
  if (error instanceof ProviderExecutionError) {
    return error.category === 'rate_limit' || (error.statusCode ?? 0) >= 500;
  }
  return false;
};
