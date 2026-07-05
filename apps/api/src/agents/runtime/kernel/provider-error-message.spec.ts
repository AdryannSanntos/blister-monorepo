import { ProviderExecutionError } from '@company-os/agent-ia-sdk';
import { isTransientUserFacingProviderError, toUserFacingProviderError } from './provider-error-message';

describe('isTransientUserFacingProviderError', () => {
  it('detects provider 5xx outage messages', () => {
    expect(
      isTransientUserFacingProviderError(
        'O AssemblyAI está indisponível no momento (erro 500). Tente novamente em instantes.',
      ),
    ).toBe(true);
  });

  it('detects rate limit messages', () => {
    expect(
      isTransientUserFacingProviderError(
        'Limite de uso do AssemblyAI atingido. Aguarde alguns minutos e tente novamente.',
      ),
    ).toBe(true);
  });

  it('ignores auth failures', () => {
    expect(
      isTransientUserFacingProviderError(
        'Falha de autenticação no AssemblyAI. Verifique se a chave de API está correta e ativa.',
      ),
    ).toBe(false);
  });
});

describe('toUserFacingProviderError', () => {
  it('includes AssemblyAI metadata validation errors', () => {
    const message = toUserFacingProviderError(
      new ProviderExecutionError(
        'assemblyai',
        'validation',
        JSON.stringify({
          code: 400,
          message: 'invalid request body',
          metadata: { errors: ['messages[1].content too long'] },
        }),
        400,
      ),
    );

    expect(message).toContain('messages[1].content too long');
  });
});
