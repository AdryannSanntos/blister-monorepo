import { runRagSearchTool } from './rag-search.tool';

describe('runRagSearchTool', () => {
  it('returns a normalized envelope with citations and truncation metadata', async () => {
    const ragContextAssemblyService = {
      assemble: jest.fn().mockResolvedValue({
        query: 'reembolso',
        chunks: [
          {
            sourceType: 'brain_entry',
            sourceId: 'b1',
            title: 'Politica de reembolso',
            snippet: 'Reembolso em ate 7 dias.',
            score: 0.9,
          },
          {
            sourceType: 'asset',
            sourceId: 'a1',
            title: 'FAQ financeiro',
            snippet: 'Perguntas frequentes.',
            score: 0.7,
          },
        ],
        totalFound: 2,
        metadata: {},
      }),
    };

    const result = await runRagSearchTool(ragContextAssemblyService as never, {
      organizationId: 'org-1',
      query: 'reembolso',
      limit: 1,
      permissions: ['context.read', 'brain.read'],
    });

    expect(ragContextAssemblyService.assemble).toHaveBeenCalledWith('org-1', 'reembolso', {
      limit: 1,
      permissions: ['context.read', 'brain.read'],
    });
    expect(result.toolName).toBe('rag_search');
    expect(result.results).toEqual([
      expect.objectContaining({
        title: 'Politica de reembolso',
        sourceType: 'brain_entry',
        sourceId: 'b1',
      }),
    ]);
    expect(result.citations).toEqual([
      expect.objectContaining({ label: 'Politica de reembolso', sourceType: 'brain_entry' }),
    ]);
    expect(result.metadata).toMatchObject({ resultCount: 1, truncated: true });
  });

  it('returns an empty result summary when no relevant chunks are found', async () => {
    const ragContextAssemblyService = {
      assemble: jest.fn().mockResolvedValue({
        query: 'curriculo',
        chunks: [],
        totalFound: 0,
        metadata: {},
      }),
    };

    const result = await runRagSearchTool(ragContextAssemblyService as never, {
      organizationId: 'org-1',
      query: 'curriculo',
      limit: 3,
      permissions: ['context.read'],
    });

    expect(result.summary).toBe('Nenhum trecho relevante encontrado no contexto da empresa.');
    expect(result.results).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.metadata.resultCount).toBe(0);
  });
});
