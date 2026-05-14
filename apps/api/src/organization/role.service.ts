import {
  type AppPermissionKey,
  type DefaultSystemRole,
  defaultSystemRoles,
  getDefaultRolePermissions,
} from '@company-os/authz';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto } from './dto';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  async seedDefaultRoles(organizationId: string) {
    const roles = [];

    for (const roleName of defaultSystemRoles) {
      const permissions = getDefaultRolePermissions(roleName as DefaultSystemRole);
      const role = await this.prisma.role.create({
        data: {
          organizationId,
          name: roleName,
          isSystem: true,
          permissions: {
            create: permissions.map((key) => ({ key })),
          },
        },
        include: { permissions: true },
      });
      roles.push(role);
    }

    return roles;
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.role.findMany({
      where: { organizationId },
      include: { permissions: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return role;
  }

  async findSystemRole(organizationId: string, name: string) {
    return this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId, name } },
      include: { permissions: true },
    });
  }

  async create(organizationId: string, dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });

    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists in this organization`);
    }

    return this.prisma.role.create({
      data: {
        organizationId,
        name: dto.name,
        isSystem: false,
        permissions: {
          create: dto.permissions.map((key: AppPermissionKey) => ({ key })),
        },
      },
      include: { permissions: true },
    });
  }

  async update(roleId: string, dto: CreateRoleDto) {
    const role = await this.findById(roleId);

    if (role.isSystem) {
      throw new ConflictException('Cannot modify a system role');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.rolePermission.deleteMany({ where: { roleId } });

      return tx.role.update({
        where: { id: roleId },
        data: {
          name: dto.name,
          permissions: {
            create: dto.permissions.map((key: AppPermissionKey) => ({ key })),
          },
        },
        include: { permissions: true },
      });
    });
  }

  async delete(roleId: string) {
    const role = await this.findById(roleId);

    if (role.isSystem) {
      throw new ConflictException('Cannot delete a system role');
    }

    await this.prisma.role.delete({ where: { id: roleId } });
  }
}
