import { serializeContextMarkdown } from './context-markdown.serializer';

describe('serializeContextMarkdown', () => {
  it('serializes operational context with stable headings and no internal metadata', () => {
    const markdown = serializeContextMarkdown({
      companyName: 'Acme Ops',
      industry: 'B2B Services',
      description: 'Opera freelancers em escala.',
      mission: 'Aumentar qualidade operacional.',
      vision: 'Ser a camada de execucao das empresas.',
      valueProposition: 'Coordena trabalho com contexto.',
      products: 'Gestao de demandas.',
      pricing: 'Assinatura mensal.',
      idealCustomer: 'Empresas com fornecedores externos.',
      painPoints: 'Briefings ruins.',
      channels: 'LinkedIn e indicacoes.',
      tone: 'Direto e consultivo.',
      communicationStyle: 'Objetivo.',
      avoidWords: 'Evitar jargoes vazios.',
      differentials: 'Contexto persistido.',
      faq: 'Como funciona? Com workspace por empresa.',
      processes: 'Briefing, execucao, revisao.',
      rules: 'Toda decisao relevante fica documentada.',
      tools: 'Workana AI.',
    });

    expect(markdown).toContain('# Company Context');
    expect(markdown.indexOf('## Business overview')).toBeLessThan(
      markdown.indexOf('## Positioning'),
    );
    expect(markdown.indexOf('## Positioning')).toBeLessThan(
      markdown.indexOf('## Products and services'),
    );
    expect(markdown).toContain('- Company: Acme Ops');
    expect(markdown).not.toContain('confidence');
    expect(markdown).not.toContain('ranking');
  });

  it('uses deterministic fallbacks when context fields are empty', () => {
    const markdown = serializeContextMarkdown({});

    expect(markdown).toContain('No business overview has been registered yet.');
    expect(markdown).toContain('No products or services have been registered yet.');
    expect(markdown).toContain('No operational rules have been registered yet.');
  });
});
