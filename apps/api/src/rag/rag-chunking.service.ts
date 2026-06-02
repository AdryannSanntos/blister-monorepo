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

    // Flatten the document into segments that are each guaranteed to fit inside
    // a chunk. Extracted PDF/DOCX text often arrives as one whitespace-collapsed
    // blob with no paragraph breaks, so without this step the whole document
    // would collapse into a single oversized chunk whose embedding is too
    // diluted to retrieve specific facts.
    const segments = this.toBoundedSegments(text, targetChars);
    if (segments.length === 0) {
      return [this.buildChunk(text)];
    }

    const chunks: Array<{ content: string; tokenCount: number }> = [];
    let current = '';

    for (const segment of segments) {
      if (current.length + segment.length + 2 <= targetChars) {
        current = current ? `${current}\n\n${segment}` : segment;
        continue;
      }

      if (current) {
        chunks.push(this.buildChunk(current));
        // Carry an overlap tail so context isn't severed at the boundary — but
        // only when it still fits, otherwise a max-sized segment would push the
        // next chunk over the target.
        const tail = current.slice(-overlapChars);
        current =
          tail && tail.length + segment.length + 2 <= targetChars
            ? `${tail}\n\n${segment}`
            : segment;
      } else {
        current = segment;
      }
    }

    if (current.trim()) {
      chunks.push(this.buildChunk(current));
    }

    return chunks.length ? chunks : [this.buildChunk(text)];
  }

  /**
   * Breaks text into a flat list of segments, each no larger than `targetChars`.
   * Paragraphs are split by sentence when oversized, and any sentence still too
   * large (e.g. a long bullet run with no terminal punctuation) is hard-sliced.
   */
  private toBoundedSegments(text: string, targetChars: number): string[] {
    const segments: string[] = [];

    const paragraphs = text
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const paragraph of paragraphs) {
      if (paragraph.length <= targetChars) {
        segments.push(paragraph);
        continue;
      }

      for (const sentence of paragraph.split(/(?<=[.!?])\s+/)) {
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        if (trimmed.length <= targetChars) {
          segments.push(trimmed);
          continue;
        }

        for (let i = 0; i < trimmed.length; i += targetChars) {
          segments.push(trimmed.slice(i, i + targetChars));
        }
      }
    }

    return segments;
  }

  private buildChunk(content: string): { content: string; tokenCount: number } {
    const trimmed = content.trim();
    return {
      content: trimmed,
      tokenCount: Math.ceil(trimmed.length / RagChunkingService.CHARS_PER_TOKEN),
    };
  }
}
