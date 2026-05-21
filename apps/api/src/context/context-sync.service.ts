import { tasks } from '@trigger.dev/sdk';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContextSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueSourceIngest(organizationId: string, sourceId: string) {
    await this.prisma.contextSource.update({
      where: { id: sourceId },
      data: { pipelineStatus: 'pending', pipelineError: null },
    });

    await tasks.trigger('context-source-ingest', { organizationId, sourceId });
  }

  async enqueueArtifactSync(organizationId: string) {
    await this.prisma.contextArtifact.upsert({
      where: { organizationId },
      create: { organizationId, syncStatus: 'syncing', syncError: null },
      update: { syncStatus: 'syncing', syncError: null },
    });

    await tasks.trigger('context-sync', { organizationId });
  }
}
