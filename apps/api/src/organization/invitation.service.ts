import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EMAIL_PORT, type EmailPort } from '../email';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateInvitationDto } from './dto';
import { RoleService } from './role.service';

const INVITATION_EXPIRY_DAYS = 7;

@Injectable()
export class InvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleService: RoleService,
    @Inject(EMAIL_PORT) private readonly email: EmailPort,
  ) {}

  async create(organizationId: string, inviterId: string, dto: CreateInvitationDto) {
    const existingMember = await this.prisma.membership.findFirst({
      where: {
        organizationId,
        user: { email: dto.email },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const pendingInvite = await this.prisma.invitation.findFirst({
      where: {
        organizationId,
        email: dto.email,
        status: 'pending',
      },
    });

    if (pendingInvite) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    if (dto.roleId) {
      await this.roleService.findById(dto.roleId);
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    const invitation = await this.prisma.invitation.create({
      data: {
        email: dto.email,
        inviterId,
        organizationId,
        roleId: dto.roleId ?? null,
        expiresAt,
      },
      include: { organization: true },
    });

    await this.email.send({
      to: dto.email,
      subject: `You've been invited to ${invitation.organization.name}`,
      html: `<p>You have been invited to join <strong>${invitation.organization.name}</strong>.</p><p>This invitation expires on ${expiresAt.toLocaleDateString()}.</p>`,
    });

    return invitation;
  }

  async accept(invitationId: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new ConflictException(`Invitation is already ${invitation.status}`);
    }

    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitationId },
        data: { status: 'expired' },
      });
      throw new ConflictException('Invitation has expired');
    }

    const existingMember = await this.prisma.membership.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException('User is already a member of this organization');
    }

    const roleId =
      invitation.roleId ??
      (await this.roleService.findSystemRole(invitation.organizationId, 'member'))?.id;

    if (!roleId) {
      throw new NotFoundException('Default member role not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.invitation.update({
        where: { id: invitationId },
        data: { status: 'accepted' },
      });

      return tx.membership.create({
        data: {
          userId,
          organizationId: invitation.organizationId,
          roles: {
            create: { roleId },
          },
        },
        include: {
          organization: true,
          roles: { include: { role: true } },
        },
      });
    });
  }

  async cancel(invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.status !== 'pending') {
      throw new ConflictException(`Invitation is already ${invitation.status}`);
    }

    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'cancelled' },
    });
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingByEmail(email: string) {
    return this.prisma.invitation.findMany({
      where: { email, status: 'pending' },
      include: { organization: true },
    });
  }
}
