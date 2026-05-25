import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

interface ChunkResult {
  id: string;
  sequence: number;
  content: string;
  tokenCount: number;
}

@Injectable()
export class RagChunkingService {
  private static readonly TARGET_TOKENS = 512;
  private static readonly OVERLAP_TOKENS = 64;
  // Rough average: 1 token ≈ 4 chars in English/Portuguese
  private static readonly CHARS_PER_TOKEN = 4;

  constructor(private readonly prisma: PrismaService) {}

  async chunkDocument(
    documentId: string,
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<ChunkResult[]> {
    const chunks = this.splitIntoChunks(content);

    if (chunks.length === 0) {
      return [];
    }

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.ragChunk.deleteMany({ where: { documentId } });
      return Promise.all(
        chunks.map((chunk, index) =>
          tx.ragChunk.create({
            data: {
              documentId,
              sequence: index,
              content: chunk.content,
              tokenCount: chunk.tokenCount,
              metadata: toJsonValue({ ...metadata, chunkIndex: index }),
            },
          }),
        ),
      );
    });

    return created.map((c, i) => ({
      id: c.id,
      sequence: i,
      content: chunks[i].content,
      tokenCount: chunks[i].tokenCount,
    }));
  }

  private splitIntoChunks(text: string): Array<{ content: string; tokenCount: number }> {
    const targetChars = RagChunkingService.TARGET_TOKENS * RagChunkingService.CHARS_PER_TOKEN;
    const overlapChars = RagChunkingService.OVERLAP_TOKENS * RagChunkingService.CHARS_PER_TOKEN;

    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const chunks: Array<{ content: string; tokenCount: number }> = [];

    let current = '';

    for (const paragraph of paragraphs) {
      if (current.length + paragraph.length + 2 <= targetChars) {
        current = current ? `${current}\n\n${paragraph}` : paragraph;
        continue;
      }

      if (current) {
        chunks.push(this.buildChunk(current));
        // Overlap: carry tail of current chunk
        const tail = current.slice(-overlapChars);
        current = tail ? `${tail}\n\n${paragraph}` : paragraph;
      } else {
        // Single paragraph larger than target — hard-split by sentence
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (current.length + sentence.length + 1 <= targetChars) {
            current = current ? `${current} ${sentence}` : sentence;
          } else {
            if (current) chunks.push(this.buildChunk(current));
            current = sentence;
          }
        }
      }
    }

    if (current.trim()) {
      chunks.push(this.buildChunk(current));
    }

    return chunks.length ? chunks : [this.buildChunk(text)];
  }

  private buildChunk(content: string): { content: string; tokenCount: number } {
    const trimmed = content.trim();
    return {
      content: trimmed,
      tokenCount: Math.ceil(trimmed.length / RagChunkingService.CHARS_PER_TOKEN),
    };
  }
}
