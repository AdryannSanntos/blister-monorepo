import { ForbiddenException } from '@nestjs/common';
import { AgentToolPolicyService } from './agent-tool-policy.service';
import { AgentToolRuntimeService } from './agent-tool-runtime.service';
import type { WebResearchGateway } from './tools/web-research.tool';

describe('AgentToolRuntimeService', () => {
  let runtime: AgentToolRuntimeService;
  let ragContextAssemblyService: { assemble: jest.Mock };
  let agentContextService: { resolveForRun: jest.Mock };
  let webResearchGateway: jest.Mocked<WebResearchGateway>;

  const baseInput = {
    organizationId: 'org-1',
    agentId: 'agent-1',
    userId: 'user-1',
    allowedTools: ['rag_search', 'file_search', 'web_research'],
    userPermissions: ['context.read', 'brain.read', 'asset.read'],
    query: 'política de reembolso',
  };

  beforeEach(() => {
    ragContextAssemblyService = {
      assemble: jest.fn().mockResolvedValue({
        query: 'política de reembolso',
        chunks: [
          {
            id: 'chunk-1',
            documentId: 'doc-1',
            sourceType: 'brain_entry',
            sourceId: 'src-1',
            title: 'Reembolsos',
            snippet: 'Reembolsos em até 7 dias.',
            score: 0.9,
            metadata: {},
          },
        ],
        totalFound: 1,
      }),
    };
    agentContextService = {
      resolveForRun: jest.fn().mockResolvedValue({
        files: [{ id: 'file-1', filename: 'manual.pdf', objectKey: 'k' }],
        references: [],
        agentProfile: {},
      }),
    };
    webResearchGateway = { searchAndFetch: jest.fn().mockResolvedValue([]) };

    runtime = new AgentToolRuntimeService(
      new AgentToolPolicyService(),
      ragContextAssemblyService as never,
      agentContextService as never,
      webResearchGateway,
    );
  });

  it('runs rag_search when enabled and returns a normalized envelope', async () => {
    const result = await runtime.run({ ...baseInput, toolName: 'rag_search' });

    expect(result.toolName).toBe('rag_search');
    expect(result.results).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({ label: 'Reembolsos', sourceType: 'brain_entry' });
    expect(result.metadata.resultCount).toBe(1);
    expect(ragContextAssemblyService.assemble).toHaveBeenCalledWith('org-1', baseInput.query, {
      limit: 6,
      permissions: ['context.read', 'brain.read', 'asset.read'],
    });
  });

  it('rejects disabled tools', async () => {
    await expect(
      runtime.run({ ...baseInput, allowedTools: ['rag_search'], toolName: 'web_research' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('normalizes file_search output combining context files and rag documents', async () => {
    const result = await runtime.run({ ...baseInput, toolName: 'file_search', query: 'manual' });

    expect(result.toolName).toBe('file_search');
    expect(result.results.some((row) => row.origin === 'agent_context_file')).toBe(true);
    expect(result.results.some((row) => row.origin === 'rag_document')).toBe(true);
  });

  it('narrows rag_search source scope to the user permissions', async () => {
    await runtime.run({
      ...baseInput,
      userPermissions: ['context.read'],
      toolName: 'rag_search',
    });

    expect(ragContextAssemblyService.assemble).toHaveBeenCalledWith('org-1', baseInput.query, {
      limit: 6,
      permissions: ['context.read'],
    });
  });

  it('returns an empty web_research envelope when no provider is configured', async () => {
    const result = await runtime.run({ ...baseInput, toolName: 'web_research' });

    expect(result.toolName).toBe('web_research');
    expect(result.results).toHaveLength(0);
    expect(result.summary).toContain('Nenhuma fonte externa');
  });
});
