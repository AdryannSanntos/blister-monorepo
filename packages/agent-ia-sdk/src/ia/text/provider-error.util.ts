/**
 * Provider error helpers for the text capability.
 *
 * The error class and HTTP-status classification are defined once at the package
 * root (`errors.ts`) so every `ia/` capability shares them without importing a
 * sibling capability. This module re-exports the text-relevant surface.
 */
export {
  ProviderExecutionError,
  type ProviderErrorCategory,
  mapProviderErrorCategory,
  parseProviderError,
  isRetryable,
} from '../../errors';
