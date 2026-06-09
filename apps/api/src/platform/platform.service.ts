import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLATFORM_ROLES,
  type AssignPlatformRoleDto,
  type StartSupportSessionDto,
} from './dto';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlatformAdmins() {
    return this.prisma.platformRoleAssignment.findMany({
      orderBy: { assignedAt: 'asc' },
    });
  }

  async assignPlatformRole(
    actorUserId: string,
    targetUserId: string,
    input: AssignPlatformRoleDto,
  ) {
    if (!(PLATFORM_ROLES as readonly string[]).includes(input.role)) {
      throw new BadRequestException(
        `Invalid platform role. Must be one of: ${PLATFORM_ROLES.join(', ')}`,
      );
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const assignment = await tx.platformRoleAssignment.create({
          data: {
            userId: targetUserId,
            role: input.role,
            assignedBy: actorUserId,
          },
        });

        await tx.auditLog.create({
          data: {
            actorUserId,
            targetUserId,
            action: 'assign_platform_role',
            resourceType: 'PlatformRoleAssignment',
            resourceId: assignment.id,
            metadata: { role: input.role },
          },
        });

        return assignment;
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictException('Platform role already assigned');
      }
      throw err;
    }
  }

  async removePlatformRole(actorUserId: string, assignmentId: string) {
    const assignment = await this.prisma.platformRoleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Platform role assignment not found');
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to prevent TOCTOU race
      if (assignment.role === 'platform_owner') {
        const ownerCount = await tx.platformRoleAssignment.count({
          where: { role: 'platform_owner' },
        });
        if (ownerCount <= 1) {
          throw new BadRequestException('Cannot remove the last platform_owner');
        }
      }

      await tx.platformRoleAssignment.delete({ where: { id: assignmentId } });
      await tx.auditLog.create({
        data: {
          actorUserId,
          targetUserId: assignment.userId,
          action: 'remove_platform_role',
          resourceType: 'PlatformRoleAssignment',
          resourceId: assignmentId,
          metadata: { role: assignment.role },
        },
      });
    });
  }

  async startSupportSession(actorUserId: string, input: StartSupportSessionDto) {
    if (!input.reason || input.reason.length < 8) {
      throw new BadRequestException('reason must be at least 8 characters');
    }

    return this.prisma.$transaction(async (tx) => {
      const session = await tx.supportSession.create({
        data: {
          actorUserId,
          reason: input.reason,
          status: 'active',
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'start_support_session',
          resourceType: 'SupportSession',
          resourceId: session.id,
          metadata: { reason: input.reason },
        },
      });

      return session;
    });
  }

  async endSupportSession(actorUserId: string, sessionId: string) {
    const session = await this.prisma.supportSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Support session not found');
    }

    if (session.actorUserId !== actorUserId) {
      throw new ForbiddenException('You can only end your own support sessions');
    }

    if (session.status !== 'active') {
      throw new BadRequestException(`Session is already ${session.status}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.supportSession.update({
        where: { id: sessionId },
        data: { status: 'ended', endedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          action: 'end_support_session',
          resourceType: 'SupportSession',
          resourceId: sessionId,
          metadata: {},
        },
      });

      return updated;
    });
  }

  async getUserPlatformRoles(userId: string) {
    return this.prisma.platformRoleAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: 'asc' },
    });
  }
}
