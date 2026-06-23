import type { PrismaClient } from '@company-os/db';
import type {
  IngestDocumentDto,
  RagRetrievalQuery,
  RagRetrievedChunk,
} from '@company-os/types/dist/rag';
import type { IEmbeddingProvider } from '../embedding/embedding-provider';
import type { ITextProvider } from '../text/text-provider';
import { CaptionService, type CaptionInput } from './caption.service';
import { ChunkService } from './chunk.service';
import { DocumentService } from './document.service';
import { EmbeddingRepository } from './embedding.repository';
import { IngestionService, type IngestResult } from './ingestion.service';
import { RetrievalService } from './retrieval.service';

export * from './document.service';
export * from './chunk.service';
export * from './embedding.repository';
export * from './ingestion.service';
export * from './retrieval.service';
export * from './caption.service';

/** A caption model resolved for the current platform settings. */
export interface ResolvedCaptionProvider {
  provider: ITextProvider;
  model: string;
}

export interface RagServiceDeps {
  prisma: PrismaClient;
  /**
   * Resolves the embedding provider from the current platform settings.
   * Called per operation so admin model changes take effect without a restart.
   * Throws `EmbeddingModelNotConfiguredError` when none is configured.
   */
  resolveEmbedding: () => Promise<IEmbeddingProvider>;
  /** Resolves the caption text provider; `null` when no caption model is set. */
  resolveCaption: () => Promise<ResolvedCaptionProvider | null>;
}

/**
 * RAG façade — `{ ingest, retrieve, caption }`. Builds the thin per-operation
 * services from freshly-resolved providers, keeping `ia/rag` dependent only on
 * the `IEmbeddingProvider` / `ITextProvider` interfaces.
 */
export class RagService {
  constructor(private readonly deps: RagServiceDeps) {}

  async ingest(dto: IngestDocumentDto): Promise<IngestResult> {
    const embedding = await this.deps.resolveEmbedding();
    const documentService = new DocumentService(this.deps.prisma);
    const chunkService = new ChunkService(this.deps.prisma);
    const embeddingRepository = new EmbeddingRepository({
      prisma: this.deps.prisma,
      embedding,
    });
    const ingestion = new IngestionService({
      prisma: this.deps.prisma,
      documentService,
      chunkService,
      embeddingRepository,
    });
    return ingestion.ingest(dto);
  }

  async retrieve(query: RagRetrievalQuery): Promise<RagRetrievedChunk[]> {
    const embedding = await this.deps.resolveEmbedding();
    const embeddingRepository = new EmbeddingRepository({
      prisma: this.deps.prisma,
      embedding,
    });
    return new RetrievalService(embeddingRepository).search(query);
  }

  async caption(input: CaptionInput): Promise<string | null> {
    const resolved = await this.deps.resolveCaption();
    if (!resolved) return null;
    const caption = await new CaptionService({
      textProvider: resolved.provider,
      model: resolved.model,
    }).caption(input);
    return caption.trim() || null;
  }
}
