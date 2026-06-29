import { isTransientUserFacingProviderError } from './provider-error-message';

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
