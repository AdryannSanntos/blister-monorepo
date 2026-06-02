import { runFileSearchTool } from './file-search.tool';

describe('runFileSearchTool', () => {
  it('combines matching context files and rag documents into one normalized envelope', async () => {
    const deps = {
      agentContextService: {
        resolveForRun: jest.fn().mockResolvedValue({
          files: [
            { id: 'file-1', filename: 'curriculo-adryan.pdf' },
            { id: 'file-2', filename: 'contrato-acme.pdf' },
          ],
        }),
      },
      ragContextAssemblyService: {
        assemble: jest.fn().mockResolvedValue({
          query: 'curriculo-adryan',
          chunks: [
            {
              documentId: 'doc-1',
              title: 'Curriculo Adryan',
              snippet: 'Experiencia com NestJS e Next.js',
              score: 0.93,
            },
          ],
          totalFound: 1,
          metadata: {},
        }),
      },
    };

    const result = await runFileSearchTool(deps as never, {
      organizationId: 'org-1',
      agentId: 'agent-1',
      query: 'curriculo-adryan',
      limit: 5,
      permissions: ['context.read', 'asset.read'],
    });

    expect(deps.agentContextService.resolveForRun).toHaveBeenCalledWith('org-1', 'agent-1');
    expect(deps.ragContextAssemblyService.assemble).toHaveBeenCalledWith(
      'org-1',
      'curriculo-adryan',
      {
        limit: 5,
        permissions: ['context.read', 'asset.read'],
      },
    );
    expect(result.toolName).toBe('file_search');
    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origin: 'agent_context_file', filename: 'curriculo-adryan.pdf' }),
        expect.objectContaining({ origin: 'rag_document', title: 'Curriculo Adryan' }),
      ]),
    );
    expect(result.citations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'curriculo-adryan.pdf', sourceType: 'agent_context_file' }),
        expect.objectContaining({ label: 'Curriculo Adryan', sourceType: 'rag_document' }),
      ]),
    );
  });

  it('matches a filename even when the query is a natural-language sentence', async () => {
    const deps = {
      agentContextService: {
        resolveForRun: jest.fn().mockResolvedValue({
          files: [{ id: 'file-1', filename: 'curriculo-adryan.pdf' }],
        }),
      },
      ragContextAssemblyService: {
        assemble: jest.fn().mockResolvedValue({
          query: 'o que temos sobre o curriculo do adryan santos',
          chunks: [],
          totalFound: 0,
          metadata: {},
        }),
      },
    };

    const result = await runFileSearchTool(deps as never, {
      organizationId: 'org-1',
      agentId: 'agent-1',
      query: 'o que temos sobre o curriculo do adryan santos',
      limit: 5,
      permissions: ['context.read'],
    });

    expect(result.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ origin: 'agent_context_file', filename: 'curriculo-adryan.pdf' }),
      ]),
    );
  });

  it('filters context files by filename match and respects the result limit', async () => {
    const deps = {
      agentContextService: {
        resolveForRun: jest.fn().mockResolvedValue({
          files: [
            { id: 'file-1', filename: 'briefing-acme.pdf' },
            { id: 'file-2', filename: 'briefing-beta.pdf' },
            { id: 'file-3', filename: 'contrato.pdf' },
          ],
        }),
      },
      ragContextAssemblyService: {
        assemble: jest.fn().mockResolvedValue({
          query: 'briefing',
          chunks: [
            {
              documentId: 'doc-1',
              title: 'Briefing comercial',
              snippet: 'Resumo comercial',
              score: 0.5,
            },
          ],
          totalFound: 1,
          metadata: {},
        }),
      },
    };

    const result = await runFileSearchTool(deps as never, {
      organizationId: 'org-1',
      agentId: 'agent-1',
      query: 'briefing',
      limit: 2,
      permissions: ['context.read'],
    });

    expect(result.results).toHaveLength(2);
    expect(result.results.every((row) => row.origin !== 'agent_context_file' || String(row.filename).includes('briefing'))).toBe(true);
    expect(result.metadata).toMatchObject({ resultCount: 2, truncated: true });
  });

  it('returns an empty envelope when nothing matches in files or documents', async () => {
    const deps = {
      agentContextService: {
        resolveForRun: jest.fn().mockResolvedValue({ files: [] }),
      },
      ragContextAssemblyService: {
        assemble: jest.fn().mockResolvedValue({
          query: 'nao existe',
          chunks: [],
          totalFound: 0,
          metadata: {},
        }),
      },
    };

    const result = await runFileSearchTool(deps as never, {
      organizationId: 'org-1',
      agentId: 'agent-1',
      query: 'nao existe',
      limit: 3,
      permissions: ['context.read'],
    });

    expect(result.summary).toBe('Nenhum arquivo relevante encontrado.');
    expect(result.results).toEqual([]);
    expect(result.citations).toEqual([]);
    expect(result.metadata.resultCount).toBe(0);
  });
});
