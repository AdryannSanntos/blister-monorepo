import { task } from '@trigger.dev/sdk';
import { PrismaService } from '../src/prisma/prisma.service';
import type { IngestDocumentDto } from '@company-os/types';
import { buildContextMarkdownFromSources } from './shared/markdown-builders';
import { createRagIndexingService } from './shared/rag-sync';
import { organizationSyncPayloadSchema } from './shared/task-payloads';
import { writeMarkdownArtifact } from './shared/s3-artifact-writer';
import { buildSearchableDocument } from '../src/rag/file-text-extraction';

const COMPANY_CONTEXT_SOURCE_ID = '__company_context__';

function buildContextSourceDocument(source: {
  id: string;
  title: string;
  description: string | null;
  sourceKind: string;
  fileName: string | null;
  sourceUrl: string | null;
  category: string | null;
  tags: string[];
  normalizedContent: string | null;
  extractedContent: string | null;
}): IngestDocumentDto {
  return {
    sourceType: 'context_source',
    sourceId: source.id,
    title: source.title,
    forceReindex: true,
    metadata: {
      sourceKind: source.sourceKind,
      fileName: source.fileName,
      sourceUrl: source.sourceUrl,
      category: source.category,
      tags: source.tags,
    },
    content: buildSearchableDocument([
      { value: source.title },
      { label: 'Tipo', value: source.sourceKind },
      { label: 'Arquivo', value: source.fileName },
      { label: 'URL', value: source.sourceUrl },
      { label: 'Categoria', value: source.category },
      { label: 'Tags', value: source.tags.join(', ') },
      { label: 'Descricao', value: source.description },
      {
        label: 'Conteudo extraido',
        value: source.normalizedContent ?? source.extractedContent ?? source.description,
      },
    ]),
  };
}

export const contextSyncTask = task({
  id: 'context-sync',
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: unknown) => {
    const { organizationId } = organizationSyncPayloadSchema.parse(payload);
    const prisma = new PrismaService();
    await prisma.onModuleInit();
    const key = `organizations/${organizationId}/context/context.md`;

    try {
      const indexingService = createRagIndexingService(prisma);
      const markdown = await buildContextMarkdownFromSources(prisma, organizationId);
      await writeMarkdownArtifact(key, markdown);

      const sources = await prisma.contextSource.findMany({
        where: { organizationId, pipelineStatus: 'approved' },
        orderBy: { updatedAt: 'desc' },
      });
      const sourceCount = sources.length;

      await indexingService.ingest(organizationId, {
        sourceType: 'context_source',
        sourceId: COMPANY_CONTEXT_SOURCE_ID,
        title: 'Contexto da empresa',
        content: markdown,
        metadata: { artifactKey: key, kind: 'context_artifact' },
        forceReindex: true,
      });

      for (const source of sources) {
        await indexingService.ingest(
          organizationId,
          buildContextSourceDocument(source),
        );
      }

      await prisma.ragDocument.updateMany({
        where: {
          organizationId,
          sourceType: 'context_source',
          sourceId: {
            notIn: [COMPANY_CONTEXT_SOURCE_ID, ...sources.map((source) => source.id)],
          },
          status: { not: 'archived' },
        },
        data: { status: 'archived' },
      });

      await prisma.contextArtifact.upsert({
        where: { organizationId },
        create: {
          organizationId,
          syncStatus: 'synced',
          syncedAt: new Date(),
          syncError: null,
          objectKey: key,
          sourceCount,
        },
        update: {
          syncStatus: 'synced',
          syncedAt: new Date(),
          syncError: null,
          objectKey: key,
          sourceCount,
        },
      });

      return { key, sourceCount };
    } catch (error) {
      await prisma.contextArtifact.upsert({
        where: { organizationId },
        create: { organizationId, syncStatus: 'error', syncError: 'Context sync failed.' },
        update: { syncStatus: 'error', syncError: 'Context sync failed.' },
      });
      throw error;
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
