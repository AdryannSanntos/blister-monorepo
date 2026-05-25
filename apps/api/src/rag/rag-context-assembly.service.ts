import { Injectable } from '@nestjs/common';
import type { RagContextPack, RagRetrievedChunk } from '@company-os/types';
import { RagRetrievalService } from './rag-retrieval.service';

interface AssemblyOptions {
  limit?: number;
  minScore?: number;
  sourceTypes?: string[];
  permissions?: string[];
}

@Injectable()
export class RagContextAssemblyService {
  constructor(private readonly retrievalService: RagRetrievalService) {}

  async assemble(
    organizationId: string,
    query: string,
    options: AssemblyOptions = {},
  ): Promise<RagContextPack> {
    const chunks = await this.retrievalService.search(organizationId, query, options);

    return {
      query,
      chunks,
      totalFound: chunks.length,
      metadata: {
        organizationId,
        assembledAt: new Date().toISOString(),
      },
    };
  }

  /**
   * Formats a context pack as a compact prompt string for injection into LLM calls.
   * Outputs a numbered list of snippets with their source labels.
   */
  formatForPrompt(pack: RagContextPack): string {
    if (pack.chunks.length === 0) {
      return '';
    }

    const lines = pack.chunks.map((chunk, i) => {
      const sourceLabel = this.buildSourceLabel(chunk);
      return `[${i + 1}] ${sourceLabel}\n${chunk.snippet}`;
    });

    return `## Contexto relevante\n\n${lines.join('\n\n')}`;
  }

  private buildSourceLabel(chunk: RagRetrievedChunk): string {
    if (chunk.title) return chunk.title;
    const typeMap: Record<string, string> = {
      brain_entry: 'Brain',
      asset: 'Asset',
      agent_context_file: 'Arquivo de contexto',
      manual: 'Documento',
    };
    return typeMap[chunk.sourceType] ?? chunk.sourceType;
  }
}
