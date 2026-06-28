import {
  allPermissionKeys,
  assignablePermissionKeys,
  isAssignablePermissionKey,
  type AppPermissionKey,
} from '@company-os/authz';
import type { CreateRoleDto, UpdateRoleDto } from '@company-os/types';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditService } from '../audit/audit.service';
import { getActiveCompanyIdFromRequest } from '../company/company-context.util';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly workspaceContext: WorkspaceContextService,
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

  private async resolveCompanyId(userId: string, req: Request): Promise<string> {
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);

    if (workspace.type !== 'company') {
      throw new BadRequestException(
        'Role management is only available when a company workspace is selected',
      );
    }

    return workspace.companyId;
  }

  async findAll(userId: string, req: Request) {
    const companyId = await this.resolveCompanyId(userId, req);

    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: { name: 'asc' },
    });

    const memberCounts = await this.prisma.companyMember.groupBy({
      by: ['roleId'],
      where: { companyId },
      _count: { roleId: true },
    });

    const countByRoleId = new Map(
      memberCounts.map((entry) => [entry.roleId, entry._count.roleId]),
    );

    return roles.map((role) =>
      this.serializeRole({
        ...role,
        _count: { memberAssignments: countByRoleId.get(role.id) ?? 0 },
      }),
    );
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
    });
    if (!role) throw new NotFoundException('Cargo não encontrado');
    if (role.isSystem) {
      throw new ForbiddenException('Cargos de sistema não podem ser excluídos');
    }

    const companyMemberCount = await this.prisma.companyMember.count({
      where: { roleId: id },
    });
    if (companyMemberCount > 0) {
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

  async getEffectiveAbilityForUser(userId: string, req?: Request): Promise<AppPermissionKey[]> {
    const resolved = await this.resolveEffectivePermissions(userId, req);
    if (resolved.isOwner) {
      return [...allPermissionKeys];
    }
    return resolved.keys;
  }

  private async resolveEffectivePermissions(
    userId: string,
    req?: Request,
  ): Promise<{ keys: AppPermissionKey[]; isOwner: boolean }> {
    const companyId = req ? getActiveCompanyIdFromRequest(req) : undefined;

    if (companyId) {
      return this.resolvePermissionsForCompany(userId, companyId);
    }

    return this.resolvePermissionsAcrossWorkspaces(userId);
  }

  private async resolvePermissionsForCompany(
    userId: string,
    companyId: string,
  ): Promise<{ keys: AppPermissionKey[]; isOwner: boolean }> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        ownerUserId: true,
        members: {
          where: { userId },
          include: {
            role: {
              include: { permissions: true },
            },
          },
        },
      },
    });

    if (!company) {
      return { keys: [], isOwner: false };
    }

    if (company.ownerUserId === userId) {
      return { keys: [], isOwner: true };
    }

    const membership = company.members[0];
    if (!membership) {
      return { keys: [], isOwner: false };
    }

    return this.permissionsFromRole(membership.role);
  }

  private async resolvePermissionsAcrossWorkspaces(
    userId: string,
  ): Promise<{ keys: AppPermissionKey[]; isOwner: boolean }> {
    const [memberships, assignments, ownedCompanyCount] = await Promise.all([
      this.prisma.companyMember.findMany({
        where: { userId },
        include: {
          role: {
            include: { permissions: true },
          },
        },
      }),
      this.prisma.userRoleAssignment.findMany({
        where: { userId },
        include: {
          role: {
            include: { permissions: true },
          },
        },
      }),
      this.prisma.company.count({
        where: { ownerUserId: userId },
      }),
    ]);

    if (ownedCompanyCount > 0) {
      return { keys: [], isOwner: true };
    }

    const keys = new Set<AppPermissionKey>();
    let isOwner = false;

    for (const membership of memberships) {
      const resolved = this.permissionsFromRole(membership.role);
      if (resolved.isOwner) {
        isOwner = true;
      }
      for (const key of resolved.keys) {
        keys.add(key);
      }
    }

    for (const assignment of assignments) {
      const resolved = this.permissionsFromRole(assignment.role);
      if (resolved.isOwner) {
        isOwner = true;
      }
      for (const key of resolved.keys) {
        keys.add(key);
      }
    }

    return { keys: [...keys], isOwner };
  }

  private permissionsFromRole(role: {
    name: string;
    permissions: { key: string }[];
  }): { keys: AppPermissionKey[]; isOwner: boolean } {
    const isOwner = role.name === 'owner';
    const keys = role.permissions
      .map((permission) => permission.key)
      .filter((key): key is AppPermissionKey => isAssignablePermissionKey(key));

    return { keys, isOwner };
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
