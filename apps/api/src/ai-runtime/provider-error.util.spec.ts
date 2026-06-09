import {
  ProviderExecutionError,
  ProviderNotConfiguredError,
} from './adapters/ai-provider.adapter';
import { toUserFacingProviderError } from './provider-error.util';

describe('toUserFacingProviderError', () => {
  it('maps OpenRouter payment required errors', () => {
    const message = toUserFacingProviderError(
      new ProviderExecutionError(
        'openrouter',
        'validation',
        '{"error":{"message":"Insufficient credits"}}',
        402,
      ),
    );

    expect(message).toContain('Créditos insuficientes no OpenRouter');
  });

  it('maps missing provider configuration', () => {
    const message = toUserFacingProviderError(
      new ProviderNotConfiguredError('gemini'),
    );

    expect(message).toContain('Google Gemini');
    expect(message).toContain('chave de API');
  });

  it('maps rate limit errors', () => {
    const message = toUserFacingProviderError(
      new ProviderExecutionError('gemini', 'rate_limit', 'Quota exceeded', 429),
    );

    expect(message).toContain('Limite de uso');
  });
});
