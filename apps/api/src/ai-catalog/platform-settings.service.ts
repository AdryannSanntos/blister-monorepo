import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import type { updateCreditSettingsSchema } from './dto/ai-catalog.dto';

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getSettings() {
    const credits = await this.prisma.platformCreditSettings.findUnique({
      where: { id: 'default' },
    });
    return { credits };
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
