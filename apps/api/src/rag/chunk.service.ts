import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '../ai-runtime/embedding.service';
import type { RagChunk, Prisma } from '../generated/prisma';

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
}

export interface ChunkData {
  content: string;
  chunkIndex: number;
  tokenCount: number;
  metadata?: Record<string, unknown>;
}

const DEFAULT_CHUNK_SIZE = 512;
const DEFAULT_CHUNK_OVERLAP = 64;

@Injectable()
export class ChunkService {
  private readonly logger = new Logger(ChunkService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService,
  ) {}

  async chunkAndStore(
    documentId: string,
    companyId: string,
    content: string,
    options?: ChunkOptions & {
      campaignId?: string;
      agentId?: string;
      metadata?: Record<string, unknown>;
    },
  ): Promise<RagChunk[]> {
    const settings = await this.embeddingService.getDefaultSettings();
    const chunkSize = options?.chunkSize ?? settings.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const chunkOverlap = options?.chunkOverlap ?? settings.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;

    const chunks = this.splitIntoChunks(content, chunkSize, chunkOverlap);

    await this.prisma.ragChunk.deleteMany({ where: { documentId } });

    const created = await Promise.all(
      chunks.map((chunk, index) =>
        this.prisma.ragChunk.create({
          data: {
            documentId,
            companyId,
            campaignId: options?.campaignId,
            agentId: options?.agentId,
            chunkIndex: index,
            content: chunk.content,
            tokenCount: chunk.tokenCount,
            metadata: {
              ...options?.metadata,
              ...chunk.metadata,
            } as Prisma.InputJsonValue,
          },
        }),
      ),
    );

    this.logger.debug(`Created ${created.length} chunks for document ${documentId}`);
    return created;
  }

  async getChunksByDocument(documentId: string): Promise<RagChunk[]> {
    return this.prisma.ragChunk.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });
  }

  async getChunksByIds(ids: string[]): Promise<RagChunk[]> {
    return this.prisma.ragChunk.findMany({
      where: { id: { in: ids } },
    });
  }

  async deleteByDocument(documentId: string): Promise<number> {
    const result = await this.prisma.ragChunk.deleteMany({
      where: { documentId },
    });
    return result.count;
  }

  private splitIntoChunks(
    text: string,
    chunkSize: number,
    overlap: number,
  ): ChunkData[] {
    const chunks: ChunkData[] = [];
    const sentences = this.splitIntoSentences(text);
    
    let currentChunk = '';
    let currentTokens = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokens + sentenceTokens > chunkSize && currentChunk) {
        chunks.push({
          content: currentChunk.trim(),
          chunkIndex,
          tokenCount: currentTokens,
        });
        chunkIndex++;

        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        currentTokens = this.estimateTokens(currentChunk);
      } else {
        currentChunk += sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex,
        tokenCount: currentTokens,
      });
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    const sentences = text.split(/(?<=[.!?])\s+/);
    return sentences.filter((s) => s.trim().length > 0);
  }

  private getOverlapText(text: string, overlapTokens: number): string {
    const words = text.split(/\s+/);
    const tokensPerWord = 1.3;
    const wordsToKeep = Math.ceil(overlapTokens / tokensPerWord);
    return words.slice(-wordsToKeep).join(' ') + ' ';
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
