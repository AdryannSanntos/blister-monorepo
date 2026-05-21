import { tasks } from '@trigger.dev/sdk';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DesignSystemSyncService {
  constructor(private readonly prisma: PrismaService) {}

  async enqueueDesignSystemSync(organizationId: string) {
    await this.prisma.designSystemProfile.update({
      where: { organizationId },
      data: { artifactSyncStatus: 'pending', artifactSyncError: null },
    });

    await tasks.trigger('design-system-sync', { organizationId });
  }

  async enqueueContextSync(organizationId: string) {
    await this.prisma.designSystemProfile.upsert({
      where: { organizationId },
      create: { organizationId, contextArtifactSyncStatus: 'pending', contextArtifactSyncError: null },
      update: { contextArtifactSyncStatus: 'pending', contextArtifactSyncError: null },
    });

    await tasks.trigger('context-sync', { organizationId });
  }
}
