import { task } from '@trigger.dev/sdk';
import { PrismaClient } from '../src/generated/prisma';
import { buildDesignSystemMarkdown } from './shared/markdown-builders';
import { organizationSyncPayloadSchema } from './shared/task-payloads';
import { writeMarkdownArtifact } from './shared/s3-artifact-writer';

export const designSystemSyncTask = task({
  id: 'design-system-sync',
  retry: { maxAttempts: 3, factor: 1.8, minTimeoutInMs: 500, maxTimeoutInMs: 30_000 },
  run: async (payload: unknown) => {
    const { organizationId } = organizationSyncPayloadSchema.parse(payload);
    const prisma = new PrismaClient();
    const key = `organizations/${organizationId}/design-system/design-system.md`;

    try {
      const markdown = await buildDesignSystemMarkdown(prisma, organizationId);
      await writeMarkdownArtifact(key, markdown);
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
      await prisma.$disconnect();
    }
  },
});
