import { task } from '@trigger.dev/sdk';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildSearchableDocument, extractTextFromBuffer } from '../src/rag/file-text-extraction';
import { StorageService } from '../src/storage/storage.service';
import { buildDesignSystemMarkdown } from './shared/markdown-builders';
import { createRagIndexingService } from './shared/rag-sync';
import { organizationSyncPayloadSchema } from './shared/task-payloads';
import { writeMarkdownArtifact } from './shared/s3-artifact-writer';

const storage = new StorageService({
  get: <T = string>(key: string, defaultValue?: T) =>
    ((process.env[key] as T | undefined) ?? defaultValue) as T,
} as never);

const DESIGN_SYSTEM_SOURCE_ID = '__design_system__';

export const designSystemSyncTask = task({
  id: 'design-system-sync',
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: unknown) => {
    const { organizationId } = organizationSyncPayloadSchema.parse(payload);
    const prisma = new PrismaService();
    await prisma.onModuleInit();
    const key = `organizations/${organizationId}/design-system/design-system.md`;

    try {
      const indexingService = createRagIndexingService(prisma);
      const markdown = await buildDesignSystemMarkdown(prisma, organizationId);
      await writeMarkdownArtifact(key, markdown);

      await indexingService.ingest(organizationId, {
        sourceType: 'design_system',
        sourceId: DESIGN_SYSTEM_SOURCE_ID,
        title: 'Design system',
        content: markdown,
        metadata: { artifactKey: key },
        forceReindex: true,
      });

      const assets = await prisma.designAsset.findMany({
        where: { organizationId },
        orderBy: { updatedAt: 'desc' },
      });

      for (const asset of assets) {
        let extractedText: string | null = null;
        try {
          const buffer = await storage.getObjectBuffer(asset.objectKey);
          extractedText = await extractTextFromBuffer({
            buffer,
            contentType: asset.contentType,
            fileName: asset.fileName,
          });
        } catch {
          extractedText = null;
        }

        await indexingService.ingest(organizationId, {
          sourceType: 'design_asset',
          sourceId: asset.id,
          title: asset.title ?? asset.fileName,
          forceReindex: true,
          metadata: {
            primaryRole: asset.primaryRole,
            secondaryTags: asset.secondaryTags,
            contentType: asset.contentType,
            fileName: asset.fileName,
            objectKey: asset.objectKey,
          },
          content: buildSearchableDocument([
            { value: asset.title ?? asset.fileName },
            { label: 'Papel principal', value: asset.primaryRole },
            { label: 'Arquivo', value: asset.fileName },
            { label: 'Tipo', value: asset.contentType },
            { label: 'Tags', value: asset.secondaryTags.join(', ') },
            { label: 'Descricao', value: asset.description },
            { label: 'Conteudo extraido', value: extractedText },
          ]),
        });
      }

      await prisma.ragDocument.updateMany({
        where: {
          organizationId,
          sourceType: 'design_asset',
          sourceId: { notIn: assets.map((asset) => asset.id) },
          status: { not: 'archived' },
        },
        data: { status: 'archived' },
      });

      await prisma.designSystemProfile.update({
        where: { organizationId },
        data: {
          artifactSyncStatus: 'synced',
          artifactSyncedAt: new Date(),
          artifactSyncError: null,
          artifactObjectKey: key,
        },
      });
      return { key };
    } catch (error) {
      await prisma.designSystemProfile.update({
        where: { organizationId },
        data: { artifactSyncStatus: 'failed', artifactSyncError: 'Design system sync failed.' },
      });
      throw error;
    } finally {
      await prisma.onModuleDestroy();
    }
  },
});
