import { splitOversizedContentMachineCopy } from './content-paragraph-splitter.util';
import type { TruncatableSlideCopy } from './copy-limits.util';

describe('content-paragraph-splitter.util', () => {
  it('splits oversized body into body and body2 when subtitle exists', () => {
    const longBody =
      'Primeira frase com contexto amplo. Segunda frase com detalhe concreto. Terceira frase com exemplo real. Quarta frase fecha o raciocínio com impacto editorial. Quinta frase reforça a tese principal. Sexta frase adiciona mais densidade narrativa para ultrapassar o limite de split.';

    const input: TruncatableSlideCopy = {
      narrativeRole: 'scene',
      body: longBody,
      subtitle: 'Takeaway curto.',
    };
    const result = splitOversizedContentMachineCopy(input, { templateId: 'content-machine' });

    expect(result.body?.length).toBeLessThanOrEqual(220);
    expect(result.body2).toBeTruthy();
    expect(result.subtitle).toBe('Takeaway curto.');
  });

  it('splits oversized body into three blocks when subtitle is missing', () => {
    const longBody =
      'A. B. C. D. E. F. G. H. I. J. K. L. M. N. O. P. Q. R. S. T. U. V. W. X. Y. Z. '.repeat(3);

    const input: TruncatableSlideCopy = { narrativeRole: 'proof', body: longBody };
    const result = splitOversizedContentMachineCopy(input, { templateId: 'content-machine' });

    expect(result.body).toBeTruthy();
    expect(result.body2).toBeTruthy();
    expect(result.subtitle).toBeTruthy();
  });

  it('does not split short body copy', () => {
    const input: TruncatableSlideCopy = {
      narrativeRole: 'scene',
      body: 'Copy curta com ==destaque==.',
      subtitle: 'Fechamento.',
    };
    const result = splitOversizedContentMachineCopy(input, { templateId: 'content-machine' });

    expect(result.body).toBe('Copy curta com ==destaque==.');
    expect(result.body2).toBeUndefined();
  });

  it('ignores non content-machine templates', () => {
    const longBody = 'a'.repeat(250);

    const input: TruncatableSlideCopy = { narrativeRole: 'scene', body: longBody };
    const result = splitOversizedContentMachineCopy(input, { templateId: 'editorial-performance' });

    expect(result.body).toBe(longBody);
    expect(result.body2).toBeUndefined();
  });
});
