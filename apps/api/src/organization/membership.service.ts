import {
  type AppPermissionKey,
  type PermissionOverride,
  defineAbilityForPermissions,
} from '@company-os/authz';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MembershipService {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrgAndUser(organizationId: string, userId: string) {
    return this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: {
        roles: { include: { role: { include: { permissions: true } } } },
        overrides: true,
      },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.membership.findMany({
      where: { organizationId },
      include: {
        user: { select: { id: true, name: true, email: true, image: true } },
        roles: { include: { role: true } },
        overrides: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addRole(membershipId: string, roleId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const existing = await this.prisma.membershipRole.findUnique({
      where: { membershipId_roleId: { membershipId, roleId } },
    });

    if (existing) {
      throw new ConflictException('Role already assigned to this member');
    }

    return this.prisma.membershipRole.create({
      data: { membershipId, roleId },
      include: { role: true },
    });
  }

  async removeRole(membershipId: string, roleId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { roles: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (membership.roles.length <= 1) {
      throw new ConflictException('Cannot remove the last role from a member');
    }

    const assignment = await this.prisma.membershipRole.findUnique({
      where: { membershipId_roleId: { membershipId, roleId } },
    });

    if (!assignment) {
      throw new NotFoundException('Role assignment not found');
    }

    await this.prisma.membershipRole.delete({
      where: { id: assignment.id },
    });
  }

  async updateRoles(membershipId: string, roleIds: string[]) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { roles: true },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    if (roleIds.length === 0) {
      throw new ConflictException('Member must have at least one role');
    }

    await this.prisma.membershipRole.deleteMany({ where: { membershipId } });
    await this.prisma.membershipRole.createMany({
      data: roleIds.map((roleId) => ({ membershipId, roleId })),
    });

    return this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { roles: { include: { role: true } } },
    });
  }

  async deactivateMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: { roles: { include: { role: true } } },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found');
    }

    const isOwner = membership.roles.some((mr) => mr.role.name === 'owner');
    if (isOwner) {
      throw new ForbiddenException('Cannot deactivate an owner');
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { active: false },
    });
  }

  async activateMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { active: true },
    });
  }

  async setOverride(membershipId: string, key: AppPermissionKey, effect: 'allow' | 'deny') {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
    });

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    return this.prisma.membershipPermissionOverride.upsert({
      where: { membershipId_key: { membershipId, key } },
      create: { membershipId, key, effect },
      update: { effect },
    });
  }

  async removeOverride(membershipId: string, key: string) {
    const override = await this.prisma.membershipPermissionOverride.findUnique({
      where: { membershipId_key: { membershipId, key } },
    });

    if (!override) {
      throw new NotFoundException('Override not found');
    }

    await this.prisma.membershipPermissionOverride.delete({
      where: { id: override.id },
    });
  }

  async removeMember(organizationId: string, membershipId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id: membershipId },
      include: {
        roles: { include: { role: true } },
      },
    });

    if (!membership || membership.organizationId !== organizationId) {
      throw new NotFoundException('Membership not found');
    }

    const isOwner = membership.roles.some((mr) => mr.role.name === 'owner');

    if (isOwner) {
      const ownerCount = await this.prisma.membership.count({
        where: {
          organizationId,
          roles: { some: { role: { name: 'owner' } } },
        },
      });

      if (ownerCount <= 1) {
        throw new ForbiddenException('Cannot remove the last owner of an organization');
      }
    }

    await this.prisma.membership.delete({ where: { id: membershipId } });
  }

  async getEffectiveAbility(organizationId: string, userId: string) {
    const membership = await this.findByOrgAndUser(organizationId, userId);

    if (!membership) {
      throw new NotFoundException('Membership not found');
    }

    const rolePermissions = new Set<AppPermissionKey>();
    for (const mr of membership.roles) {
      for (const rp of mr.role.permissions) {
        rolePermissions.add(rp.key as AppPermissionKey);
      }
    }

    const overrides: PermissionOverride[] = membership.overrides.map((o) => ({
      key: o.key as AppPermissionKey,
      effect: o.effect as 'allow' | 'deny',
    }));

    const isOwner = membership.roles.some((mr) => mr.role.name === 'owner');

    return defineAbilityForPermissions([...rolePermissions], overrides, isOwner);
  }
}
