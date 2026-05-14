import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationService } from './organization.service';
import { RoleService } from './role.service';

const makeMockPrisma = () => ({
  organization: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  membership: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
});

const makeMockRoleService = () => ({
  seedDefaultRoles: jest.fn(),
  findById: jest.fn(),
  findSystemRole: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByOrganization: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;
type MockRoleService = ReturnType<typeof makeMockRoleService>;

describe('OrganizationService', () => {
  let service: OrganizationService;
  let prisma: MockPrisma;
  let roleService: MockRoleService;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    roleService = makeMockRoleService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationService,
        { provide: PrismaService, useValue: prisma },
        { provide: RoleService, useValue: roleService },
      ],
    }).compile();

    service = module.get<OrganizationService>(OrganizationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('throws ConflictException when slug is already taken', async () => {
      prisma.organization.findUnique.mockResolvedValue({ id: 'existing', slug: 'my-org' });

      await expect(
        service.createWorkspace('user-1', { name: 'My Org', slug: 'my-org' }),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.createWorkspace('user-1', { name: 'My Org', slug: 'my-org' }),
      ).rejects.toThrow('Slug "my-org" is already taken');

      expect(prisma.organization.create).not.toHaveBeenCalled();
    });

    it('creates organization, seeds default roles, and creates owner membership', async () => {
      const userId = 'user-1';
      const org = { id: 'org-1', name: 'My Org', slug: 'my-org' };
      const roles = [
        { id: 'role-owner', name: 'owner', isSystem: true, permissions: [] },
        { id: 'role-admin', name: 'admin', isSystem: true, permissions: [] },
        { id: 'role-member', name: 'member', isSystem: true, permissions: [] },
      ];
      const membership = {
        id: 'mem-1',
        userId,
        organizationId: org.id,
        roles: [{ role: roles[0] }],
      };

      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue(org);
      roleService.seedDefaultRoles.mockResolvedValue(roles);
      prisma.membership.create.mockResolvedValue(membership);

      const result = await service.createWorkspace(userId, { name: 'My Org', slug: 'my-org' });

      expect(prisma.organization.create).toHaveBeenCalledWith({
        data: { name: 'My Org', slug: 'my-org' },
      });
      expect(roleService.seedDefaultRoles).toHaveBeenCalledWith(org.id);
      expect(prisma.membership.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            organizationId: org.id,
            roles: { create: { roleId: 'role-owner' } },
          }),
        }),
      );
      expect(result).toEqual({ organization: org, membership });
    });

    it('uses the owner role (not admin or member) for the initial membership', async () => {
      const org = { id: 'org-1', name: 'Acme', slug: 'acme' };
      const roles = [
        { id: 'role-owner', name: 'owner' },
        { id: 'role-admin', name: 'admin' },
        { id: 'role-member', name: 'member' },
      ];

      prisma.organization.findUnique.mockResolvedValue(null);
      prisma.organization.create.mockResolvedValue(org);
      roleService.seedDefaultRoles.mockResolvedValue(roles);
      prisma.membership.create.mockResolvedValue({ id: 'mem-1' });

      await service.createWorkspace('user-1', { name: 'Acme', slug: 'acme' });

      const membershipCall = prisma.membership.create.mock.calls[0][0];
      expect(membershipCall.data.roles.create.roleId).toBe('role-owner');
    });
  });

  describe('findById', () => {
    it('returns organization when it exists', async () => {
      const org = { id: 'org-1', name: 'Acme', slug: 'acme' };
      prisma.organization.findUnique.mockResolvedValue(org);

      const result = await service.findById('org-1');

      expect(result).toEqual(org);
    });

    it('throws NotFoundException when organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow('Organization not found');
    });
  });

  describe('findBySlug', () => {
    it('returns organization when slug exists', async () => {
      const org = { id: 'org-1', name: 'Acme', slug: 'acme' };
      prisma.organization.findUnique.mockResolvedValue(org);

      const result = await service.findBySlug('acme');

      expect(result).toEqual(org);
      expect(prisma.organization.findUnique).toHaveBeenCalledWith({ where: { slug: 'acme' } });
    });

    it('throws NotFoundException when slug does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('no-such-slug')).rejects.toThrow(NotFoundException);
      await expect(service.findBySlug('no-such-slug')).rejects.toThrow('Organization not found');
    });
  });

  describe('findByUserId', () => {
    it('returns empty array when user has no memberships', async () => {
      prisma.membership.findMany.mockResolvedValue([]);

      const result = await service.findByUserId('user-with-no-orgs');

      expect(result).toEqual([]);
    });

    it('returns organizations with roles from memberships', async () => {
      const memberships = [
        {
          organization: { id: 'org-1', name: 'Acme', slug: 'acme' },
          roles: [{ role: { id: 'role-owner', name: 'owner' } }],
        },
      ];
      prisma.membership.findMany.mockResolvedValue(memberships);

      const result = await service.findByUserId('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'org-1', name: 'Acme', slug: 'acme' });
      expect(result[0].roles).toEqual([{ id: 'role-owner', name: 'owner' }]);
    });

    it('maps multiple memberships to organization+roles pairs', async () => {
      const memberships = [
        {
          organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' },
          roles: [{ role: { id: 'r1', name: 'member' } }],
        },
        {
          organization: { id: 'org-2', name: 'Org 2', slug: 'org-2' },
          roles: [{ role: { id: 'r2', name: 'admin' } }],
        },
      ];
      prisma.membership.findMany.mockResolvedValue(memberships);

      const result = await service.findByUserId('user-1');

      expect(result).toHaveLength(2);
      expect(result[0].roles).toEqual([{ id: 'r1', name: 'member' }]);
      expect(result[1].roles).toEqual([{ id: 'r2', name: 'admin' }]);
    });
  });

  describe('update', () => {
    it('throws NotFoundException when organization does not exist', async () => {
      prisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { name: 'New Name' })).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.organization.update).not.toHaveBeenCalled();
    });

    it('updates organization successfully', async () => {
      const org = { id: 'org-1', name: 'Old Name', slug: 'old' };
      const updated = { ...org, name: 'New Name' };

      prisma.organization.findUnique.mockResolvedValue(org);
      prisma.organization.update.mockResolvedValue(updated);

      const result = await service.update('org-1', { name: 'New Name' });

      expect(prisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual(updated);
    });
  });
});
