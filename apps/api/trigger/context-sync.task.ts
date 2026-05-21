import { task } from '@trigger.dev/sdk';
import { PrismaClient } from '../src/generated/prisma';
import { buildContextMarkdownFromSources } from './shared/markdown-builders';
import { organizationSyncPayloadSchema } from './shared/task-payloads';
import { writeMarkdownArtifact } from './shared/s3-artifact-writer';

export const contextSyncTask = task({
  id: 'context-sync',
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: unknown) => {
    const { organizationId } = organizationSyncPayloadSchema.parse(payload);
    const prisma = new PrismaClient();
    const key = `organizations/${organizationId}/context/context.md`;

    try {
      const markdown = await buildContextMarkdownFromSources(prisma, organizationId);
      await writeMarkdownArtifact(key, markdown);

      const sourceCount = await prisma.contextSource.count({
        where: { organizationId, pipelineStatus: 'approved' },
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
      await prisma.$disconnect();
    }
  },
});
