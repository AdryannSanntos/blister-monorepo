import { formatCarouselCopyHtml, sanitizeAllowedCopyHtml } from './copy-format.util';

describe('copy-format.util', () => {
  it('converts accent and bold markers to safe html', () => {
    const result = formatCarouselCopyHtml('MUDANÇA 2: ==COMENTÁRIOS== com **resposta real**');
    expect(result).toContain('<span class="accent">COMENTÁRIOS</span>');
    expect(result).toContain('<strong>resposta real</strong>');
  });

  it('preserves allowed html tags while escaping unsafe content', () => {
    const result = sanitizeAllowedCopyHtml(
      'Texto <span class="accent">OK</span> <script>alert(1)</script>',
    );
    expect(result).toContain('<span class="accent">OK</span>');
    expect(result).not.toContain('<script>');
  });

  it('converts real and literal newlines into <br> instead of leaking raw text', () => {
    const fromReal = formatCarouselCopyHtml('5 MOTIVOS\nPELOS QUAIS\nO SAAS MUDA');
    expect(fromReal).toBe('5 MOTIVOS<br>PELOS QUAIS<br>O SAAS MUDA');

    const fromLiteral = formatCarouselCopyHtml('5 MOTIVOS\\nPELOS QUAIS');
    expect(fromLiteral).toBe('5 MOTIVOS<br>PELOS QUAIS');
    expect(fromLiteral).not.toContain('\\n');
  });
});
