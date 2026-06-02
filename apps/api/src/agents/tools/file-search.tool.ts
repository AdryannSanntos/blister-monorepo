import type { RagContextAssemblyService } from "../../rag/rag-context-assembly.service";
import type { AgentContextService } from "../agent-context.service";
import type { AgentToolResult } from "../dto/agent-chat-tool.dto";

type FileSearchResult = {
  origin: "agent_context_file" | "rag_document";
  /** Granular RAG source type (brain_entry, context_source, design_system, …). */
  sourceType?: string;
  sourceId?: string;
  fileId?: string;
  documentId?: string;
  filename?: string;
  title?: string;
  snippet: string;
  score: number;
};

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function matchesFileName(filename: string, query: string): boolean {
  const normalizedFilename = normalizeSearchText(filename);
  const normalizedQuery = normalizeSearchText(query.trim());

  if (!normalizedQuery) return true;
  if (normalizedFilename.includes(normalizedQuery)) return true;

  const tokens = normalizedQuery
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);

  if (tokens.length === 0) return false;

  const matchCount = tokens.filter((token) =>
    normalizedFilename.includes(token),
  ).length;
  return matchCount >= Math.min(tokens.length, 2);
}

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

  const contextFileResults: FileSearchResult[] = agentContext.files
    .filter((file) => matchesFileName(file.filename, input.query))
    .map((file) => ({
      origin: "agent_context_file" as const,
      sourceType: "agent_context_file",
      fileId: file.id,
      filename: file.filename,
      snippet: "",
      score: 0,
    }));

  const ragResults: FileSearchResult[] = ragPack.chunks.map((chunk) => ({
    origin: "rag_document",
    sourceType: chunk.sourceType,
    sourceId: chunk.sourceId ?? undefined,
    documentId: chunk.documentId,
    title: chunk.title ?? undefined,
    snippet: chunk.snippet,
    score: chunk.score,
  }));

  const combined = [...contextFileResults, ...ragResults];
  const results = combined.slice(0, input.limit);

  return {
    toolName: "file_search",
    summary:
      results.length > 0
        ? `Encontrados ${results.length} resultados em arquivos e documentos.`
        : "Nenhum arquivo relevante encontrado.",
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
