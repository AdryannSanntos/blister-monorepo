import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WriteAuditLogInput {
  actorUserId: string;
  targetOrganizationId?: string;
  targetUserId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async write(input: WriteAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId: input.actorUserId,
        targetOrganizationId: input.targetOrganizationId ?? null,
        targetUserId: input.targetUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata ?? {},
      },
    });
  }

  async findByActor(actorUserId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { actorUserId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async findByOrganization(organizationId: string, limit = 50) {
    return this.prisma.auditLog.findMany({
      where: { targetOrganizationId: organizationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
