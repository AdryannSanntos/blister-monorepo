import { task } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma';
import { extractTextFromBuffer } from '../src/rag/file-text-extraction';
import { StorageService } from '../src/storage/storage.service';

const storage = new StorageService({
  get: <T = string>(key: string, defaultValue?: T) =>
    ((process.env[key] as T | undefined) ?? defaultValue) as T,
} as never);

const ingestPayloadSchema = z.object({
  organizationId: z.string().min(1),
  sourceId: z.string().min(1),
});

export const contextSourceIngestTask = task({
  id: 'context-source-ingest',
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: unknown) => {
    const { organizationId, sourceId } = ingestPayloadSchema.parse(payload);
    const prisma = new PrismaClient();

    try {
      const source = await prisma.contextSource.findFirst({ where: { id: sourceId, organizationId } });
      if (!source) throw new Error(`Source not found: ${sourceId}`);

      await prisma.contextSource.update({
        where: { id: sourceId },
        data: { pipelineStatus: 'ingesting', pipelineError: null },
      });

    let extractedContent: string | null = null;
    let pipelineError: string | null = null;

      if (source.sourceKind === 'url' && source.sourceUrl) {
        await prisma.contextSource.update({ where: { id: sourceId }, data: { pipelineStatus: 'extracting' } });

        try {
          const resp = await fetch(source.sourceUrl, { signal: AbortSignal.timeout(15_000) });
          const html = await resp.text();
          extractedContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 12_000);
        } catch {
          extractedContent = null;
          pipelineError = 'Falha ao extrair conteúdo da URL.';
        }
      } else if (source.sourceKind === 'manual') {
        extractedContent = source.description ?? null;
      } else if (source.sourceKind === 'file') {
        try {
          if (source.objectKey) {
            const buffer = await storage.getObjectBuffer(source.objectKey);
            extractedContent = await extractTextFromBuffer({
              buffer,
              contentType: source.mimeType,
              fileName: source.fileName,
            });
          }
        } catch {
          pipelineError = 'Falha ao ler o arquivo enviado.';
        }

        if (!extractedContent) {
          extractedContent = source.description ?? null;
        }

        if (!extractedContent && !pipelineError) {
          pipelineError =
            'Nao foi possivel extrair texto do arquivo. O documento ainda pode ser encontrado pelos metadados.';
        }
      }

      await prisma.contextSource.update({
        where: { id: sourceId },
        data: {
          pipelineStatus: 'review',
          extractedContent,
          normalizedContent: extractedContent,
          pipelineError,
        },
      });

      return { sourceId, status: 'review' };
    } catch (error) {
      await prisma.contextSource.update({
        where: { id: sourceId },
        data: {
          pipelineStatus: 'error',
          pipelineError: error instanceof Error ? error.message : 'Ingestion failed',
        },
      });
      throw error;
    } finally {
      await prisma.$disconnect();
    }
  },
});
