import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { InviteMemberDto } from '@company-os/types';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listMembers() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        userType: true,
        createdAt: true,
        roleAssignments: {
          include: {
            role: {
              select: { id: true, name: true, isSystem: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      userType: user.userType,
      createdAt: user.createdAt.toISOString(),
      roles: user.roleAssignments.map((assignment) => ({
        id: assignment.role.id,
        name: assignment.role.name,
        isSystem: assignment.role.isSystem,
      })),
    }));
  }

  async inviteMember(actorUserId: string, dto: InviteMemberDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new NotFoundException(
        'Usuário não encontrado. A pessoa precisa criar uma conta antes de receber acesso.',
      );
    }

    const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    try {
      await this.prisma.userRoleAssignment.create({
        data: { userId: user.id, roleId: role.id },
      });
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Este usuário já possui este cargo');
      }
      throw err;
    }

    await this.audit.write({
      actorUserId,
      targetUserId: user.id,
      action: 'member.invite',
      resourceType: 'UserRoleAssignment',
      resourceId: user.id,
      metadata: { roleId: role.id, roleName: role.name },
    });

    return this.listMembers().then((members) =>
      members.find((member) => member.id === user.id),
    );
  }

  async assignRole(actorUserId: string, userId: string, roleId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    try {
      await this.prisma.userRoleAssignment.create({
        data: { userId, roleId },
      });
    } catch (err) {
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        throw new ConflictException('Este usuário já possui este cargo');
      }
      throw err;
    }

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.update',
      resourceType: 'UserRoleAssignment',
      resourceId: userId,
      metadata: { roleId, roleName: role.name, action: 'assign' },
    });
  }

  async removeRole(actorUserId: string, userId: string, roleId: string) {
    await this.assertCanRemoveRole(userId, roleId);

    const assignment = await this.prisma.userRoleAssignment.findUnique({
      where: { userId_roleId: { userId, roleId } },
      include: { role: true },
    });

    if (!assignment) throw new NotFoundException('Atribuição não encontrada');

    await this.prisma.userRoleAssignment.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.update',
      resourceType: 'UserRoleAssignment',
      resourceId: userId,
      metadata: {
        roleId,
        roleName: assignment.role.name,
        action: 'remove',
      },
    });
  }

  async removeMember(actorUserId: string, userId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: true },
    });

    if (assignments.length === 0) {
      throw new NotFoundException('Usuário sem cargos atribuídos');
    }

    for (const assignment of assignments) {
      await this.assertCanRemoveRole(userId, assignment.roleId);
    }

    await this.prisma.userRoleAssignment.deleteMany({ where: { userId } });

    await this.audit.write({
      actorUserId,
      targetUserId: userId,
      action: 'member.remove',
      resourceType: 'User',
      resourceId: userId,
    });
  }

  private async assertCanRemoveRole(userId: string, roleId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Cargo não encontrado');

    if (role.name !== 'owner') return;

    const ownerRole = role;
    const ownerAssignments = await this.prisma.userRoleAssignment.count({
      where: { roleId: ownerRole.id },
    });

    const userHasOwner = await this.prisma.userRoleAssignment.findUnique({
      where: { userId_roleId: { userId, roleId: ownerRole.id } },
    });

    if (userHasOwner && ownerAssignments <= 1) {
      throw new ForbiddenException(
        'Não é possível remover o último proprietário da plataforma',
      );
    }

    const userAssignments = await this.prisma.userRoleAssignment.count({
      where: { userId },
    });

    if (userAssignments <= 1) {
      throw new ForbiddenException(
        'Não é possível remover todos os cargos de um membro',
      );
    }
  }
}
