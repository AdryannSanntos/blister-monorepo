import type { RagContextAssemblyService } from '../../rag/rag-context-assembly.service';
import type { AgentContextService } from '../agent-context.service';
import type { AgentToolResult } from '../dto/agent-chat-tool.dto';

type FileSearchResult = {
  origin: 'agent_context_file' | 'rag_document';
  fileId?: string;
  documentId?: string;
  filename?: string;
  title?: string;
  snippet: string;
  score: number;
};

/**
 * Phase-1 scope: agent context files + RAG documents related to the org. No raw
 * filesystem grep and no unrestricted workspace reads.
 */
export async function runFileSearchTool(
  deps: {
    agentContextService: AgentContextService;
    ragContextAssemblyService: RagContextAssemblyService;
  },
  input: {
    organizationId: string;
    agentId: string;
    query: string;
    limit: number;
    permissions: string[];
  },
): Promise<AgentToolResult> {
  const startedAt = Date.now();

  const [agentContext, ragPack] = await Promise.all([
    deps.agentContextService.resolveForRun(input.organizationId, input.agentId),
    deps.ragContextAssemblyService.assemble(input.organizationId, input.query, {
      limit: input.limit,
      permissions: input.permissions,
    }),
  ]);

  const normalizedQuery = input.query.trim().toLowerCase();
  const contextFileResults: FileSearchResult[] = agentContext.files
    .filter(
      (file) =>
        normalizedQuery.length === 0 || file.filename.toLowerCase().includes(normalizedQuery),
    )
    .map((file) => ({
      origin: 'agent_context_file',
      fileId: file.id,
      filename: file.filename,
      snippet: '',
      score: 0,
    }));

  const ragResults: FileSearchResult[] = ragPack.chunks.map((chunk) => ({
    origin: 'rag_document',
    documentId: chunk.documentId,
    title: chunk.title ?? undefined,
    snippet: chunk.snippet,
    score: chunk.score,
  }));

  const combined = [...contextFileResults, ...ragResults];
  const results = combined.slice(0, input.limit);

  return {
    toolName: 'file_search',
    summary:
      results.length > 0
        ? `Encontrados ${results.length} resultados em arquivos e documentos.`
        : 'Nenhum arquivo relevante encontrado.',
    results: results.map((row) => ({ ...row })),
    citations: results.map((row) => ({
      label: row.filename ?? row.title ?? row.origin,
      sourceType: row.origin,
      sourceId: row.fileId ?? row.documentId,
    })),
    metadata: {
      durationMs: Date.now() - startedAt,
      resultCount: results.length,
      truncated: combined.length > results.length,
    },
  };
}
