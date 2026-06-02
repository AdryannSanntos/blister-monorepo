import { Injectable, Logger } from '@nestjs/common';
import { AIRuntimeService } from '../ai-runtime/ai-runtime.service';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';

const toJsonValue = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue;

@Injectable()
export class RagEmbeddingService {
  private readonly logger = new Logger(RagEmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRuntimeService: AIRuntimeService,
  ) {}

  async embedChunks(
    organizationId: string,
    chunks: Array<{ id: string; content: string }>,
  ): Promise<void> {
    for (const chunk of chunks) {
      try {
        const result = await this.aiRuntimeService.createEmbedding({
          organizationId,
          input: chunk.content,
        });

        const vector = result.embedding;
        const dimensions = vector.length;

        await this.prisma.$executeRaw`
          INSERT INTO "RagEmbedding" ("id", "chunkId", "organizationId", "model", "dimensions", "vector", "createdAt")
          VALUES (
            ${Prisma.raw(`gen_random_uuid()::text`)},
            ${chunk.id},
            ${organizationId},
            ${'default'},
            ${dimensions},
            ${JSON.stringify(vector)}::vector,
            NOW()
          )
          ON CONFLICT ("chunkId") DO UPDATE SET
            "vector" = EXCLUDED."vector",
            "model" = EXCLUDED."model",
            "dimensions" = EXCLUDED."dimensions"
        `;
      } catch (error) {
        this.logger.error(
          `Failed to embed chunk ${chunk.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
        throw error;
      }
    }
  }

  async embedQuery(organizationId: string, query: string): Promise<number[]> {
    const result = await this.aiRuntimeService.createEmbedding({
      organizationId,
      input: query,
    });
    return result.embedding;
  }

  async deleteEmbeddingsForDocument(documentId: string): Promise<void> {
    const chunks = await this.prisma.ragChunk.findMany({
      where: { documentId },
      select: { id: true },
    });

    if (chunks.length === 0) return;

    const chunkIds = chunks.map((c) => c.id);
    await this.prisma.ragEmbedding.deleteMany({
      where: { chunkId: { in: chunkIds } },
    });
  }
}
