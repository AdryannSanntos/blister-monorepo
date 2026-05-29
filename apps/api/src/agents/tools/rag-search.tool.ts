import type { RagContextAssemblyService } from '../../rag/rag-context-assembly.service';
import type { AgentToolResult } from '../dto/agent-chat-tool.dto';

export async function runRagSearchTool(
  ragContextAssemblyService: RagContextAssemblyService,
  input: { organizationId: string; query: string; limit: number; permissions: string[] },
): Promise<AgentToolResult> {
  const startedAt = Date.now();
  const pack = await ragContextAssemblyService.assemble(input.organizationId, input.query, {
    limit: input.limit,
    permissions: input.permissions,
  });

  const chunks = pack.chunks.slice(0, input.limit);

  return {
    toolName: 'rag_search',
    summary:
      chunks.length > 0
        ? `Encontrados ${chunks.length} trechos relevantes no contexto da empresa.`
        : 'Nenhum trecho relevante encontrado no contexto da empresa.',
    results: chunks.map((chunk) => ({
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId ?? undefined,
      title: chunk.title ?? undefined,
      snippet: chunk.snippet,
      score: chunk.score,
    })),
    citations: chunks.map((chunk) => ({
      label: chunk.title ?? chunk.sourceType,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId ?? undefined,
    })),
    metadata: {
      durationMs: Date.now() - startedAt,
      resultCount: chunks.length,
      truncated: pack.chunks.length > chunks.length,
    },
  };
}
