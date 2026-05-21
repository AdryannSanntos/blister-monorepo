import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateRoleDto } from './dto';
import { RoleService } from './role.service';

const makeMockPrisma = () => ({
  role: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  rolePermission: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('RoleService', () => {
  let service: RoleService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [RoleService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<RoleService>(RoleService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('seedDefaultRoles', () => {
    it('creates owner, admin, and member system roles with correct permissions', async () => {
      const orgId = 'org-1';
      const createdRoles = [
        { id: 'role-owner', name: 'owner', isSystem: true, permissions: [] },
        { id: 'role-admin', name: 'admin', isSystem: true, permissions: [] },
        { id: 'role-member', name: 'member', isSystem: true, permissions: [] },
      ];
      prisma.role.create
        .mockResolvedValueOnce(createdRoles[0])
        .mockResolvedValueOnce(createdRoles[1])
        .mockResolvedValueOnce(createdRoles[2]);

      const result = await service.seedDefaultRoles(orgId);

      expect(prisma.role.create).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result.map((r: { name: string }) => r.name)).toEqual(['owner', 'admin', 'member']);

      // owner gets all permissions
      const ownerCall = prisma.role.create.mock.calls[0][0];
      expect(ownerCall.data.organizationId).toBe(orgId);
      expect(ownerCall.data.isSystem).toBe(true);
      expect(ownerCall.data.permissions.create.length).toBeGreaterThan(0);

      // member gets fewer permissions than admin
      const adminCall = prisma.role.create.mock.calls[1][0];
      const memberCall = prisma.role.create.mock.calls[2][0];
      expect(adminCall.data.permissions.create.length).toBeGreaterThan(
        memberCall.data.permissions.create.length,
      );
    });

    it('creates each role with isSystem: true', async () => {
      prisma.role.create.mockResolvedValue({
        id: 'x',
        name: 'owner',
        isSystem: true,
        permissions: [],
      });
      await service.seedDefaultRoles('org-1');
      for (const call of prisma.role.create.mock.calls) {
        expect(call[0].data.isSystem).toBe(true);
      }
    });

    it('assigns asset and integration permissions only to owner and admin by default', async () => {
      prisma.role.create.mockResolvedValue({
        id: 'x',
        name: 'owner',
        isSystem: true,
        permissions: [],
      });

      await service.seedDefaultRoles('org-1');

      const ownerPermissions = prisma.role.create.mock.calls[0][0].data.permissions.create.map(
        (permission: { key: string }) => permission.key,
      );
      const adminPermissions = prisma.role.create.mock.calls[1][0].data.permissions.create.map(
        (permission: { key: string }) => permission.key,
      );
      const memberPermissions = prisma.role.create.mock.calls[2][0].data.permissions.create.map(
        (permission: { key: string }) => permission.key,
      );

      expect(ownerPermissions).toEqual(
        expect.arrayContaining([
          'asset.read',
          'asset.create',
          'asset.update',
          'asset.archive',
          'asset.context.review',
          'integration.read',
        ]),
      );
      expect(adminPermissions).toEqual(
        expect.arrayContaining([
          'asset.read',
          'asset.create',
          'asset.update',
          'asset.archive',
          'asset.context.review',
          'integration.read',
        ]),
      );
      expect(memberPermissions).toEqual(
        expect.not.arrayContaining([
          'asset.read',
          'asset.create',
          'asset.update',
          'asset.archive',
          'asset.context.review',
          'integration.read',
        ]),
      );
    });
  });

  describe('findById', () => {
    it('returns role when it exists', async () => {
      const role = { id: 'role-1', name: 'owner', isSystem: true, permissions: [] };
      prisma.role.findUnique.mockResolvedValue(role);

      const result = await service.findById('role-1');

      expect(result).toEqual(role);
    });

    it('throws NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
      await expect(service.findById('nonexistent')).rejects.toThrow('Role not found');
    });
  });

  describe('create', () => {
    it('creates a custom role successfully', async () => {
      const orgId = 'org-1';
      const dto: CreateRoleDto = { name: 'editor', permissions: ['company.read', 'brain.read'] };
      const createdRole = {
        id: 'role-new',
        organizationId: orgId,
        name: 'editor',
        isSystem: false,
        permissions: [],
      };

      prisma.role.findUnique.mockResolvedValue(null);
      prisma.role.create.mockResolvedValue(createdRole);

      const result = await service.create(orgId, dto);

      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { organizationId_name: { organizationId: orgId, name: dto.name } },
      });
      expect(prisma.role.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isSystem: false, name: dto.name, organizationId: orgId }),
        }),
      );
      expect(result).toEqual(createdRole);
    });

    it('throws ConflictException when a role with the same name already exists', async () => {
      const orgId = 'org-1';
      const dto: CreateRoleDto = { name: 'editor', permissions: [] };
      prisma.role.findUnique.mockResolvedValue({ id: 'existing', name: 'editor' });

      await expect(service.create(orgId, dto)).rejects.toThrow(ConflictException);
      await expect(service.create(orgId, dto)).rejects.toThrow(
        `Role "editor" already exists in this organization`,
      );
      expect(prisma.role.create).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('throws ConflictException when attempting to modify a system role', async () => {
      const systemRole = { id: 'role-1', name: 'owner', isSystem: true, permissions: [] };
      prisma.role.findUnique.mockResolvedValue(systemRole);

      const dto: CreateRoleDto = { name: 'newname', permissions: [] };

      await expect(service.update('role-1', dto)).rejects.toThrow(ConflictException);
      await expect(service.update('role-1', dto)).rejects.toThrow('Cannot modify a system role');
    });

    it('throws NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      const dto: CreateRoleDto = { name: 'newname', permissions: [] };

      await expect(service.update('nonexistent', dto)).rejects.toThrow(NotFoundException);
    });

    it('updates a custom role using a transaction', async () => {
      const customRole = { id: 'role-custom', name: 'editor', isSystem: false, permissions: [] };
      const updatedRole = { ...customRole, name: 'senior-editor' };

      prisma.role.findUnique.mockResolvedValue(customRole);

      const txMock = {
        rolePermission: { deleteMany: jest.fn().mockResolvedValue({}) },
        role: { update: jest.fn().mockResolvedValue(updatedRole) },
      };
      prisma.$transaction.mockImplementation((cb: (tx: typeof txMock) => Promise<unknown>) =>
        cb(txMock),
      );

      const dto: CreateRoleDto = { name: 'senior-editor', permissions: ['brain.read'] };
      const result = await service.update('role-custom', dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(txMock.rolePermission.deleteMany).toHaveBeenCalledWith({
        where: { roleId: 'role-custom' },
      });
      expect(result).toEqual(updatedRole);
    });
  });

  describe('delete', () => {
    it('throws ConflictException when deleting a system role', async () => {
      const systemRole = { id: 'role-owner', name: 'owner', isSystem: true, permissions: [] };
      prisma.role.findUnique.mockResolvedValue(systemRole);

      await expect(service.delete('role-owner')).rejects.toThrow(ConflictException);
      await expect(service.delete('role-owner')).rejects.toThrow('Cannot delete a system role');
      expect(prisma.role.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes a custom role successfully', async () => {
      const customRole = { id: 'role-custom', name: 'editor', isSystem: false, permissions: [] };
      prisma.role.findUnique.mockResolvedValue(customRole);
      prisma.role.delete.mockResolvedValue(customRole);

      await service.delete('role-custom');

      expect(prisma.role.delete).toHaveBeenCalledWith({ where: { id: 'role-custom' } });
    });
  });

  describe('findByOrganization', () => {
    it('returns roles for an organization', async () => {
      const roles = [
        { id: 'r1', name: 'owner', permissions: [] },
        { id: 'r2', name: 'member', permissions: [] },
      ];
      prisma.role.findMany.mockResolvedValue(roles);

      const result = await service.findByOrganization('org-1');

      expect(result).toEqual(roles);
      expect(prisma.role.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { organizationId: 'org-1' } }),
      );
    });
  });

  describe('findSystemRole', () => {
    it('returns system role by org and name', async () => {
      const role = { id: 'r1', name: 'member', isSystem: true, permissions: [] };
      prisma.role.findUnique.mockResolvedValue(role);

      const result = await service.findSystemRole('org-1', 'member');

      expect(result).toEqual(role);
      expect(prisma.role.findUnique).toHaveBeenCalledWith({
        where: { organizationId_name: { organizationId: 'org-1', name: 'member' } },
        include: { permissions: true },
      });
    });

    it('returns null when system role does not exist', async () => {
      prisma.role.findUnique.mockResolvedValue(null);

      const result = await service.findSystemRole('org-1', 'nonexistent');

      expect(result).toBeNull();
    });
  });
});
