import { ProviderNotConfiguredError } from '../../errors';
import type {
  ProviderSecrets,
  ProviderSlug,
  ResolvedProviderSecret,
} from '../../types';

/**
 * Maps a provider slug to the environment variable the backend's
 * `load-provider-secrets.ts` reads it from. Used purely for clear error
 * messages — the SDK never touches `process.env` itself.
 */
const ENV_VAR_BY_SLUG: Record<ProviderSlug, string> = {
  openrouter: 'OPENROUTER_API_KEY',
  gemini: 'GEMINI_API_KEY',
  assemblyai: 'ASSEMBLYAI_API_KEY',
};

const SUPPORTED_SLUGS = Object.keys(ENV_VAR_BY_SLUG) as ProviderSlug[];

const isSupportedSlug = (slug: string): slug is ProviderSlug =>
  (SUPPORTED_SLUGS as string[]).includes(slug);

/**
 * Resolves the credentials for a provider slug from the injected secrets.
 *
 * - Unknown slug → throws (the catalog references a provider the SDK can't serve).
 * - Known slug but empty/missing `apiKey` → throws `ProviderNotConfiguredError`
 *   naming the expected env var.
 */
export const resolveProviderSecrets = (
  secrets: ProviderSecrets,
  slug: string,
): ResolvedProviderSecret => {
  if (!isSupportedSlug(slug)) {
    throw new Error(
      `Unknown provider slug "${slug}". Supported providers: ${SUPPORTED_SLUGS.join(', ')}.`,
    );
  }

  const entry = secrets[slug];
  if (!entry || !entry.apiKey) {
    throw new ProviderNotConfiguredError(slug, ENV_VAR_BY_SLUG[slug]);
  }

  return { ...entry };
};
