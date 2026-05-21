import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { EMAIL_PORT } from '../email';
import { PrismaService } from '../prisma/prisma.service';
import { InvitationService } from './invitation.service';
import { RoleService } from './role.service';

const makeMockPrisma = () => ({
  organization: {
    findUnique: jest.fn(),
  },
  membership: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  invitation: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMockRoleService = () => ({
  findById: jest.fn(),
  findSystemRole: jest.fn(),
  seedDefaultRoles: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByOrganization: jest.fn(),
});

const makeMockEmail = () => ({
  send: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;
type MockRoleService = ReturnType<typeof makeMockRoleService>;
type MockEmail = ReturnType<typeof makeMockEmail>;

describe('InvitationService', () => {
  let service: InvitationService;
  let prisma: MockPrisma;
  let roleService: MockRoleService;
  let email: MockEmail;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    roleService = makeMockRoleService();
    email = makeMockEmail();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoleService, useValue: roleService },
        { provide: EMAIL_PORT, useValue: email },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    prisma.organization.findUnique.mockResolvedValue({ name: 'Acme' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const orgId = 'org-1';
    const inviterId = 'user-inviter';
    const dto = { email: 'invited@example.com' };

    it('throws ConflictException when user is already a member', async () => {
      prisma.membership.findFirst.mockResolvedValue({ id: 'mem-1' });

      await expect(service.create(orgId, inviterId, dto)).rejects.toThrow(ConflictException);
      await expect(service.create(orgId, inviterId, dto)).rejects.toThrow(
        'User is already a member of this organization',
      );
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when a pending invitation already exists', async () => {
      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue({ id: 'inv-1', status: 'pending' });

      await expect(service.create(orgId, inviterId, dto)).rejects.toThrow(ConflictException);
      await expect(service.create(orgId, inviterId, dto)).rejects.toThrow(
        'A pending invitation already exists for this email',
      );
      expect(prisma.invitation.create).not.toHaveBeenCalled();
    });

    it('calls roleService.findById when roleId is provided', async () => {
      const dtoWithRole = { email: 'invited@example.com', roleId: 'role-custom' };
      const invitation = {
        id: 'inv-1',
        email: dtoWithRole.email,
        organizationId: orgId,
        organization: { id: orgId, name: 'Acme' },
      };

      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      roleService.findById.mockResolvedValue({ id: 'role-custom', name: 'editor' });
      prisma.invitation.create.mockResolvedValue(invitation);
      email.send.mockResolvedValue({ id: 'email-1' });

      await service.create(orgId, inviterId, dtoWithRole);

      expect(roleService.findById).toHaveBeenCalledWith('role-custom');
    });

    it('does not call roleService.findById when roleId is not provided', async () => {
      const invitation = {
        id: 'inv-1',
        email: dto.email,
        organizationId: orgId,
        organization: { id: orgId, name: 'Acme' },
      };

      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(invitation);
      email.send.mockResolvedValue({ id: 'email-1' });

      await service.create(orgId, inviterId, dto);

      expect(roleService.findById).not.toHaveBeenCalled();
    });

    it('calls email.send with correct recipient and subject', async () => {
      const invitation = {
        id: 'inv-1',
        email: dto.email,
        organizationId: orgId,
        organization: { id: orgId, name: 'Acme Corp' },
      };

      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.organization.findUnique.mockResolvedValue({ name: 'Acme Corp' });
      prisma.invitation.create.mockResolvedValue(invitation);
      email.send.mockResolvedValue({ id: 'email-1' });

      await service.create(orgId, inviterId, dto);

      expect(email.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: dto.email,
          subject: expect.stringContaining('Acme Corp'),
        }),
      );
    });

    it('creates invitation and returns it on success', async () => {
      const invitation = {
        id: 'inv-new',
        email: dto.email,
        organizationId: orgId,
        status: 'pending',
        organization: { id: orgId, name: 'Acme' },
      };

      prisma.membership.findFirst.mockResolvedValue(null);
      prisma.invitation.findFirst.mockResolvedValue(null);
      prisma.invitation.create.mockResolvedValue(invitation);
      email.send.mockResolvedValue({ id: 'email-1' });

      const result = await service.create(orgId, inviterId, dto);

      expect(prisma.invitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: dto.email,
            inviterId,
            organizationId: orgId,
          }),
        }),
      );
      expect(result).toEqual(invitation);
    });
  });

  describe('accept', () => {
    it('throws NotFoundException when invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.accept('inv-nonexistent', 'user-1')).rejects.toThrow(NotFoundException);
      await expect(service.accept('inv-nonexistent', 'user-1')).rejects.toThrow(
        'Invitation not found',
      );
    });

    it('throws ConflictException when invitation is already accepted', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'accepted',
        expiresAt: new Date(Date.now() + 999999),
      });

      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(
        'Invitation is already accepted',
      );
    });

    it('throws ConflictException when invitation is already cancelled', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'cancelled',
        expiresAt: new Date(Date.now() + 999999),
      });

      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(
        'Invitation is already cancelled',
      );
    });

    it('throws ConflictException and marks invitation as expired when it has expired', async () => {
      const expiredDate = new Date(Date.now() - 1000);
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        expiresAt: expiredDate,
        organizationId: 'org-1',
      });
      prisma.invitation.update.mockResolvedValue({ id: 'inv-1', status: 'expired' });

      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow('Invitation has expired');

      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'expired' },
      });
    });

    it('throws ConflictException when user is already a member', async () => {
      prisma.invitation.findUnique.mockResolvedValue({
        id: 'inv-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 999999),
        organizationId: 'org-1',
        roleId: null,
      });
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem-existing' });

      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(ConflictException);
      await expect(service.accept('inv-1', 'user-1')).rejects.toThrow(
        'User is already a member of this organization',
      );
    });

    it('creates membership with the invitation roleId when provided', async () => {
      const invitation = {
        id: 'inv-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 999999),
        organizationId: 'org-1',
        roleId: 'role-custom',
      };
      const membership = {
        id: 'mem-new',
        userId: 'user-1',
        organizationId: 'org-1',
        organization: { id: 'org-1', name: 'Acme' },
        roles: [{ role: { id: 'role-custom', name: 'editor' } }],
      };

      prisma.invitation.findUnique.mockResolvedValue(invitation);
      prisma.membership.findUnique.mockResolvedValue(null);

      const txMock = {
        invitation: { update: jest.fn().mockResolvedValue({ id: 'inv-1', status: 'accepted' }) },
        membership: { create: jest.fn().mockResolvedValue(membership) },
      };
      prisma.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );

      const result = await service.accept('inv-1', 'user-1');

      expect(txMock.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'accepted' },
      });
      expect(txMock.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            organizationId: 'org-1',
            roles: { create: { roleId: 'role-custom' } },
          }),
        }),
      );
      expect(result).toEqual(membership);
    });

    it('uses default member role when invitation has no roleId', async () => {
      const invitation = {
        id: 'inv-1',
        status: 'pending',
        expiresAt: new Date(Date.now() + 999999),
        organizationId: 'org-1',
        roleId: null,
      };
      const memberRole = { id: 'role-member', name: 'member' };

      prisma.invitation.findUnique.mockResolvedValue(invitation);
      prisma.membership.findUnique.mockResolvedValue(null);
      roleService.findSystemRole.mockResolvedValue(memberRole);

      const txMock = {
        invitation: { update: jest.fn().mockResolvedValue({}) },
        membership: { create: jest.fn().mockResolvedValue({ id: 'mem-new' }) },
      };
      prisma.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );

      await service.accept('inv-1', 'user-1');

      expect(roleService.findSystemRole).toHaveBeenCalledWith('org-1', 'member');
      const membershipCreate = txMock.membership.create.mock.calls[0][0];
      expect(membershipCreate.data.roles.create.roleId).toBe('role-member');
    });
  });

  describe('cancel', () => {
    it('throws NotFoundException when invitation does not exist', async () => {
      prisma.invitation.findUnique.mockResolvedValue(null);

      await expect(service.cancel('inv-nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.cancel('inv-nonexistent')).rejects.toThrow('Invitation not found');
    });

    it('throws ConflictException when invitation is not pending', async () => {
      prisma.invitation.findUnique.mockResolvedValue({ id: 'inv-1', status: 'accepted' });

      await expect(service.cancel('inv-1')).rejects.toThrow(ConflictException);
      await expect(service.cancel('inv-1')).rejects.toThrow('Invitation is already accepted');
    });

    it('cancels invitation successfully when pending', async () => {
      const invitation = { id: 'inv-1', status: 'pending' };
      const cancelled = { ...invitation, status: 'cancelled' };

      prisma.invitation.findUnique.mockResolvedValue(invitation);
      prisma.invitation.update.mockResolvedValue(cancelled);

      const result = await service.cancel('inv-1');

      expect(prisma.invitation.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { status: 'cancelled' },
      });
      expect(result).toEqual(cancelled);
    });
  });

  describe('findByOrganization', () => {
    it('returns invitations for organization', async () => {
      const invitations = [{ id: 'inv-1', email: 'a@b.com', status: 'pending' }];
      prisma.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.findByOrganization('org-1');

      expect(result).toEqual(invitations);
      expect(prisma.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
    });
  });

  describe('findPendingByEmail', () => {
    it('returns pending invitations by email', async () => {
      const invitations = [{ id: 'inv-1', email: 'test@example.com', status: 'pending' }];
      prisma.invitation.findMany.mockResolvedValue(invitations);

      const result = await service.findPendingByEmail('test@example.com');

      expect(result).toEqual(invitations);
      expect(prisma.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: 'test@example.com', status: 'pending' } }),
      );
    });
  });
});
