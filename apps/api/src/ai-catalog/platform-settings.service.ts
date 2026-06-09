import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type {
  updateCreditSettingsSchema,
  updateRagSettingsSchema,
} from './dto/ai-catalog.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings() {
    const [credits, rag] = await Promise.all([
      this.prisma.platformCreditSettings.findUnique({
        where: { id: 'default' },
      }),
      this.prisma.ragPlatformSettings.findUnique({ where: { id: 'default' } }),
    ]);
    return { credits, rag };
  }

  async updateCreditSettings(
    adminUserId: string,
    dto: z.infer<typeof updateCreditSettingsSchema>,
  ) {
    const updated = await this.prisma.platformCreditSettings.upsert({
      where: { id: 'default' },
      update: { ...dto, updatedByUserId: adminUserId },
      create: {
        id: 'default',
        freeTierAmount: dto.freeTierAmount ?? 20,
        markupDefault: dto.markupDefault ?? 1.2,
        minRunCost: dto.minRunCost ?? 0.01,
        updatedByUserId: adminUserId,
      },
    });
    await this.audit.write({
      actorUserId: adminUserId,
      action: 'platform.credit_settings_updated',
      resourceType: 'PlatformCreditSettings',
      resourceId: 'default',
      metadata: dto as Record<string, unknown>,
    });
    return updated;
  }

  async updateRagSettings(
    adminUserId: string,
    dto: z.infer<typeof updateRagSettingsSchema>,
  ) {
    const updated = await this.prisma.ragPlatformSettings.upsert({
      where: { id: 'default' },
      update: dto,
      create: {
        id: 'default',
        chunkSize: dto.chunkSize ?? 512,
        chunkOverlap: dto.chunkOverlap ?? 64,
        topK: dto.topK ?? 8,
        rerankEnabled: dto.rerankEnabled ?? true,
        embeddingModelId: dto.embeddingModelId ?? null,
        captionModelId: dto.captionModelId ?? null,
      },
    });
    await this.audit.write({
      actorUserId: adminUserId,
      action: 'platform.rag_settings_updated',
      resourceType: 'RagPlatformSettings',
      resourceId: 'default',
      metadata: dto as Record<string, unknown>,
    });
    return updated;
  }
}
