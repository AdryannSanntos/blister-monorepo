import type {
  RagRetrievalQuery,
  RagRetrievedChunk,
  RagSourceType,
} from '@company-os/types';
import {
  EmbeddingRepository,
  type VectorSearchResult,
} from './embedding.repository';

/** Semantic retrieval over indexed chunks, always scoped by `companyId`. */
export class RetrievalService {
  constructor(private readonly embeddingRepository: EmbeddingRepository) {}

  async search(query: RagRetrievalQuery): Promise<RagRetrievedChunk[]> {
    const results = await this.embeddingRepository.searchSimilar({
      companyId: query.companyId,
      query: query.query,
      limit: query.limit ?? 8,
      minScore: query.minScore,
      sourceTypes: query.sourceTypes,
      agentId: query.agentId,
      boostAgentId: query.boostAgentId,
    });

    return results.map((r) => this.mapToChunk(r));
  }

  async searchBySourceTypes(
    companyId: string,
    query: string,
    sourceTypes: RagSourceType[],
    limit = 8,
  ): Promise<RagRetrievedChunk[]> {
    return this.search({ companyId, query, sourceTypes, limit });
  }

  async searchAgentLearning(
    companyId: string,
    query: string,
    agentId?: string,
    limit = 4,
  ): Promise<RagRetrievedChunk[]> {
    const results = await this.embeddingRepository.searchSimilar({
      companyId,
      query,
      limit,
      sourceTypes: ['AGENT_LEARNING'],
      boostAgentId: agentId,
    });

    return results.map((r) => this.mapToChunk(r));
  }

  private mapToChunk(result: VectorSearchResult): RagRetrievedChunk {
    return {
      id: result.chunkId,
      documentId: result.documentId,
      sourceType: result.sourceType as RagSourceType,
      sourceId: result.sourceId,
      title: result.title,
      content: result.content,
      score: result.score,
      chunkIndex: result.chunkIndex,
      agentId: result.agentId,
      metadata: result.metadata ?? {},
    };
  }
}
