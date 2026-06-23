/**
 * Provider credential types.
 *
 * Canonical definitions live in the package root `types.ts` (so the public
 * `index.ts` surface stays flat); this module re-exports them under
 * `ia/secrets/` where the secrets resolver consumes them.
 */
export type {
  AssemblyAiSecrets,
  GeminiSecrets,
  OpenRouterSecrets,
  ProviderSecrets,
  ProviderSlug,
  ResolvedProviderSecret,
} from '../../types';
