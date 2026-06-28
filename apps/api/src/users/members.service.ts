import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { InviteMemberDto } from '@company-os/types';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { sendPasswordResetEmail } from '../auth/send-password-reset-email';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  private async resolveCompanyId(userId: string, req: Request): Promise<string> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);

    if (workspace.type !== 'company') {
      throw new BadRequestException(
        'Team management is only available when a company workspace is selected',
      );
    }

    return workspace.companyId;
  }

  async listMembers(userId: string, req: Request) {
    const companyId = await this.resolveCompanyId(userId, req);

    const members = await this.prisma.companyMember.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            userType: true,
          },
        },
        role: {
          select: { id: true, name: true, isSystem: true },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      userType: member.user.userType,
      createdAt: member.joinedAt.toISOString(),
      roles: [
        {
          id: member.role.id,
          name: member.role.name,
          isSystem: member.role.isSystem,
        },
      ],
    }));
  }

  async inviteMember(actorUserId: string, req: Request, dto: InviteMemberDto) {
    const companyId = await this.resolveCompanyId(actorUserId, req);

    const frontendUrl =
      process.env.FRONTEND_URL ?? process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:3000';

    let user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    const isNewUser = !user;

    if (!user) {
      const userId = randomUUID();
      user = await this.prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            id: userId,
            email: dto.email,
            name: dto.email,
            emailVerified: true,
            userType: 'BUSINESS',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        await tx.account.create({
          data: {
            id: randomUUID(),
            userId: newUser.id,
            accountId: newUser.id,
            providerId: 'credential',
            password: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        return newUser;
      });
    }

    // Resolve role: use provided roleId or default to 'member' role
    let role = dto.roleId
      ? await this.prisma.role.findUnique({ where: { id: dto.roleId } })
      : await this.prisma.role.findUnique({ where: { name: 'member' } });

    if (!role) {
      role = await this.prisma.role.findFirst({ where: { isSystem: true, name: { not: 'owner' } } });
    }
    if (!role) throw new NotFoundException('Cargo padrão não encontrado');

    const existingMembership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId: user.id } },
    });

    if (existingMembership) {
      throw new ConflictException('Este usuário já faz parte desta empresa');
    }

    await this.prisma.companyMember.create({
      data: {
        companyId,
        userId: user.id,
        roleId: role.id,
      },
    });

    if (isNewUser) {
      await this.sendMemberInviteEmail(user.email, frontendUrl);
    }

    await this.audit.write({
      actorUserId,
      targetUserId: user.id,
      action: 'member.invite',
      resourceType: 'CompanyMember',
      resourceId: user.id,
      metadata: { companyId, roleId: role.id, roleName: role.name, isNewUser },
    });

    return this.listMembers(actorUserId, req).then((members) =>
      members.find((member) => member.id === user!.id),
    );
  }

  private async sendMemberInviteEmail(email: string, frontendUrl: string) {
    try {
      await sendPasswordResetEmail(email, `${frontendUrl}/auth/reset-password`);
    } catch (err) {
      this.logger.warn(`Failed to send invite email to ${email}`, err);
    }
  }

  async assignRole(
    actorUserId: string,
    req: Request,
    userId: string,
    roleId: string,
  ) {
    const companyId = await this.resolveCompanyId(actorUserId, req);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado nesta empresa');
    }

    if (membership.roleId === roleId) {
      throw new ConflictException('Este usuário já possui este cargo');
    }

    await this.prisma.companyMember.update({
      where: { companyId_userId: { companyId, userId } },
      data: { roleId },
    });

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.update',
      resourceType: 'CompanyMember',
      resourceId: userId,
      metadata: {
        companyId,
        roleId,
        roleName: role.name,
        action: 'assign',
      },
    });
  }

  async removeRole(
    actorUserId: string,
    req: Request,
    userId: string,
    roleId: string,
  ) {
    const companyId = await this.resolveCompanyId(actorUserId, req);
    await this.assertCanRemoveRole(companyId, userId, roleId);

    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { role: true },
    });

    if (!membership || membership.roleId !== roleId) {
      throw new NotFoundException('Atribuição não encontrada');
    }

    await this.prisma.companyMember.delete({
      where: { companyId_userId: { companyId, userId } },
    });

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.update',
      resourceType: 'CompanyMember',
      resourceId: userId,
      metadata: {
        companyId,
        roleId,
        roleName: membership.role.name,
        action: 'remove',
      },
    });
  }

  async removeMember(actorUserId: string, req: Request, userId: string) {
    const companyId = await this.resolveCompanyId(actorUserId, req);

    const membership = await this.prisma.companyMember.findUnique({
      where: { companyId_userId: { companyId, userId } },
      include: { role: true },
    });

    if (!membership) {
      throw new NotFoundException('Membro não encontrado nesta empresa');
    }

    await this.assertCanRemoveRole(companyId, userId, membership.roleId);

    await this.prisma.companyMember.delete({
      where: { companyId_userId: { companyId, userId } },
    });

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.remove',
      resourceType: 'CompanyMember',
      resourceId: userId,
      metadata: { companyId, roleId: membership.roleId, roleName: membership.role.name },
    });
  }

  private async assertCanRemoveRole(
    companyId: string,
    userId: string,
    roleId: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    if (role.name !== 'owner') return;

    const ownerCount = await this.prisma.companyMember.count({
      where: { companyId, roleId },
    });

    if (ownerCount <= 1) {
      throw new ForbiddenException(
        'Não é possível remover o último proprietário desta empresa',
      );
    }
  }
}
