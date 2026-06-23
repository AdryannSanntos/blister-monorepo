import { Injectable, UnprocessableEntityException } from '@nestjs/common';
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
      this.prisma.platformCreditSettings.findUnique({ where: { id: 'default' } }),
      this.getRagSettings(),
    ]);
    return { credits, rag };
  }

  async getRagSettings() {
    return this.prisma.ragPlatformSettings.findUnique({
      where: { id: 'default' },
    });
  }

  /** Asserts a model exists, is enabled, and exposes the required capability. */
  private async assertModelCapability(
    modelId: string,
    capability: string,
  ): Promise<void> {
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
      include: { provider: true },
    });
    if (!model || !model.isEnabled || !model.provider.isEnabled) {
      throw new UnprocessableEntityException(
        `Model "${modelId}" was not found or is disabled.`,
      );
    }
    if (!model.capabilities.includes(capability)) {
      throw new UnprocessableEntityException(
        `Model "${modelId}" does not support the "${capability}" capability.`,
      );
    }
  }

  async updateRagSettings(
    adminUserId: string,
    dto: z.infer<typeof updateRagSettingsSchema>,
  ) {
    if (dto.embeddingModelId) {
      await this.assertModelCapability(dto.embeddingModelId, 'embedding');
    }
    if (dto.captionModelId) {
      await this.assertModelCapability(dto.captionModelId, 'text');
    }

    const updated = await this.prisma.ragPlatformSettings.upsert({
      where: { id: 'default' },
      update: { ...dto },
      create: { id: 'default', ...dto },
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
}
