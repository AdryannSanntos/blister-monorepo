import {
  assignablePermissionKeys,
  isAssignablePermissionKey,
} from '@company-os/authz';
import type { CreateRoleDto, UpdateRoleDto } from '@company-os/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private serializeRole(
    role: {
      id: string;
      name: string;
      isSystem: boolean;
      createdAt: Date;
      updatedAt: Date;
      permissions: { key: string }[];
      _count?: { memberAssignments: number };
    },
  ) {
    return {
      id: role.id,
      name: role.name,
      isSystem: role.isSystem,
      permissions: role.permissions.map((permission) => permission.key),
      memberCount: role._count?.memberAssignments ?? 0,
      createdAt: role.createdAt.toISOString(),
      updatedAt: role.updatedAt.toISOString(),
    };
  }

  async findAll() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: { select: { memberAssignments: true } },
      },
      orderBy: { name: 'asc' },
    });

    return roles.map((role) => this.serializeRole(role));
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: true,
        _count: { select: { memberAssignments: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.serializeRole(role);
  }

  async createRole(actorUserId: string, dto: CreateRoleDto) {
    this.assertValidPermissions(dto.permissions);

    const existing = await this.prisma.role.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Já existe um cargo com este nome');
    }

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        isSystem: false,
        permissions: {
          create: dto.permissions.map((key) => ({ key })),
        },
      },
      include: {
        permissions: true,
        _count: { select: { memberAssignments: true } },
      },
    });

    await this.audit.write({
      actorUserId,
      action: 'role.create',
      resourceType: 'Role',
      resourceId: role.id,
      metadata: { name: role.name, permissions: dto.permissions },
    });

    return this.serializeRole(role);
  }

  async updateRole(actorUserId: string, id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Cargos de sistema não podem ser editados');
    }

    if (dto.permissions) {
      this.assertValidPermissions(dto.permissions);
    }

    if (dto.name) {
      const existing = await this.prisma.role.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Já existe um cargo com este nome');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        await tx.rolePermission.createMany({
          data: dto.permissions.map((key) => ({ roleId: id, key })),
        });
      }

      return tx.role.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name } : {}),
        },
        include: {
          permissions: true,
          _count: { select: { memberAssignments: true } },
        },
      });
    });

    await this.audit.write({
      actorUserId,
      action: 'role.update',
      resourceType: 'Role',
      resourceId: id,
      metadata: {
        name: dto.name ?? role.name,
        permissions: dto.permissions ?? role.permissions.map((p) => p.key),
      },
    });

    return this.serializeRole(updated);
  }

  async deleteRole(actorUserId: string, id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { memberAssignments: true } } },
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Cargos de sistema não podem ser excluídos');
    }
    if (role._count.memberAssignments > 0) {
      throw new ConflictException(
        'Não é possível excluir um cargo atribuído a membros',
      );
    }

    await this.prisma.role.delete({ where: { id } });

    await this.audit.write({
      actorUserId,
      action: 'role.delete',
      resourceType: 'Role',
      resourceId: id,
      metadata: { name: role.name },
    });

    return { success: true };
  }

  async getEffectiveAbilityForUser(userId: string) {
    const assignments = await this.prisma.userRoleAssignment.findMany({
      where: { userId },
      include: { role: { include: { permissions: true } } },
    });
    return assignments.flatMap((a) => a.role.permissions.map((p) => p.key));
  }

  private assertValidPermissions(permissions: string[]) {
    const invalid = permissions.filter(
      (key) => !isAssignablePermissionKey(key),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Permissões inválidas: ${invalid.join(', ')}. Permitidas: ${assignablePermissionKeys.join(', ')}`,
      );
    }

    const unique = new Set(permissions);
    if (unique.size !== permissions.length) {
      throw new BadRequestException('Permissões duplicadas não são permitidas');
    }
  }
}
