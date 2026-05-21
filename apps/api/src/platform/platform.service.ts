import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

  async assignPlatformRole(actorUserId: string, input: AssignPlatformRoleDto) {
    if (!(PLATFORM_ROLES as readonly string[]).includes(input.role)) {
      throw new BadRequestException(
        `Invalid platform role. Must be one of: ${PLATFORM_ROLES.join(', ')}`,
      );
    }

    const assignment = await this.prisma.platformRoleAssignment.create({
      data: {
        userId: input.userId,
        role: input.role,
        assignedBy: actorUserId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetUserId: input.userId,
        action: 'assign_platform_role',
        resourceType: 'PlatformRoleAssignment',
        resourceId: assignment.id,
        metadata: { role: input.role },
      },
    });

    return assignment;
  }

  async removePlatformRole(actorUserId: string, assignmentId: string) {
    const assignment = await this.prisma.platformRoleAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException('Platform role assignment not found');
    }

    await this.prisma.platformRoleAssignment.delete({ where: { id: assignmentId } });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetUserId: assignment.userId,
        action: 'remove_platform_role',
        resourceType: 'PlatformRoleAssignment',
        resourceId: assignmentId,
        metadata: { role: assignment.role },
      },
    });
  }

  async startSupportSession(actorUserId: string, input: StartSupportSessionDto) {
    if (!input.reason || input.reason.length < 8) {
      throw new BadRequestException('reason must be at least 8 characters');
    }

    const session = await this.prisma.supportSession.create({
      data: {
        actorUserId,
        organizationId: input.organizationId,
        reason: input.reason,
        status: 'active',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetOrganizationId: input.organizationId,
        action: 'start_support_session',
        resourceType: 'SupportSession',
        resourceId: session.id,
        metadata: { reason: input.reason },
      },
    });

    return session;
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

    const updated = await this.prisma.supportSession.update({
      where: { id: sessionId },
      data: { status: 'ended', endedAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        targetOrganizationId: session.organizationId,
        action: 'end_support_session',
        resourceType: 'SupportSession',
        resourceId: sessionId,
        metadata: {},
      },
    });

    return updated;
  }

  async getUserPlatformRoles(userId: string) {
    return this.prisma.platformRoleAssignment.findMany({
      where: { userId },
      orderBy: { assignedAt: 'asc' },
    });
  }
}
