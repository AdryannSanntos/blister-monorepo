import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './dto';
import { RoleService } from './role.service';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
  ) {}

  async createWorkspace(userId: string, dto: CreateOrganizationDto) {
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Slug "${dto.slug}" is already taken`);
    }

    const organization = await this.prisma.organization.create({
      data: { name: dto.name, slug: dto.slug },
    });

    const roles = await this.roleService.seedDefaultRoles(organization.id);
    const ownerRole = roles.find((r) => r.name === 'owner');

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        organizationId: organization.id,
        roles: {
          create: { roleId: ownerRole!.id },
        },
      },
      include: { roles: { include: { role: true } } },
    });

    return { organization, membership };
  }

  async findById(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findBySlug(slug: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { slug },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async findByUserId(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        organization: true,
        roles: { include: { role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      roles: m.roles.map((mr) => mr.role),
    }));
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async deleteOrganization(id: string) {
    await this.findById(id);
    await this.prisma.organization.delete({ where: { id } });
  }

  async transferOwnership(orgId: string, fromUserId: string, toUserId: string) {
    const [fromMembership, toMembership] = await Promise.all([
      this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: fromUserId, organizationId: orgId } },
        include: { roles: { include: { role: true } } },
      }),
      this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: toUserId, organizationId: orgId } },
        include: { roles: { include: { role: true } } },
      }),
    ]);

    if (!fromMembership) throw new NotFoundException('Current user is not a member');
    if (!toMembership)
      throw new NotFoundException('Target user is not a member of this organization');

    const ownerRole = await this.roleService.findSystemRole(orgId, 'owner');
    if (!ownerRole) throw new NotFoundException('Owner role not found');

    const toAlreadyOwner = toMembership.roles.some((mr) => mr.role.name === 'owner');

    await this.prisma.$transaction(async (tx) => {
      if (!toAlreadyOwner) {
        await tx.membershipRole.create({
          data: { membershipId: toMembership.id, roleId: ownerRole.id },
        });
      }

      const fromOwnerAssignment = fromMembership.roles.find((mr) => mr.role.name === 'owner');
      if (fromOwnerAssignment) {
        await tx.membershipRole.delete({ where: { id: fromOwnerAssignment.id } });
      }
    });

    return { success: true };
  }
}
