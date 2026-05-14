import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MembershipService } from './membership.service';

const makeMockPrisma = () => ({
  membership: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
  },
  membershipRole: {
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  membershipPermissionOverride: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  $transaction: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('MembershipService', () => {
  let service: MembershipService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [MembershipService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<MembershipService>(MembershipService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addRole', () => {
    it('throws NotFoundException when membership does not exist', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.addRole('mem-nonexistent', 'role-1')).rejects.toThrow(NotFoundException);
      await expect(service.addRole('mem-nonexistent', 'role-1')).rejects.toThrow(
        'Membership not found',
      );
      expect(prisma.membershipRole.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when role is already assigned to membership', async () => {
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem-1', userId: 'user-1' });
      prisma.membershipRole.findUnique.mockResolvedValue({
        id: 'mr-1',
        membershipId: 'mem-1',
        roleId: 'role-1',
      });

      await expect(service.addRole('mem-1', 'role-1')).rejects.toThrow(ConflictException);
      await expect(service.addRole('mem-1', 'role-1')).rejects.toThrow(
        'Role already assigned to this member',
      );
      expect(prisma.membershipRole.create).not.toHaveBeenCalled();
    });

    it('creates membership role when membership exists and role is not yet assigned', async () => {
      const membership = { id: 'mem-1', userId: 'user-1' };
      const newMembershipRole = {
        id: 'mr-1',
        membershipId: 'mem-1',
        roleId: 'role-2',
        role: { id: 'role-2', name: 'admin' },
      };

      prisma.membership.findUnique.mockResolvedValue(membership);
      prisma.membershipRole.findUnique.mockResolvedValue(null);
      prisma.membershipRole.create.mockResolvedValue(newMembershipRole);

      const result = await service.addRole('mem-1', 'role-2');

      expect(prisma.membershipRole.create).toHaveBeenCalledWith({
        data: { membershipId: 'mem-1', roleId: 'role-2' },
        include: { role: true },
      });
      expect(result).toEqual(newMembershipRole);
    });
  });

  describe('removeRole', () => {
    it('throws NotFoundException when membership does not exist', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.removeRole('mem-nonexistent', 'role-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeRole('mem-nonexistent', 'role-1')).rejects.toThrow(
        'Membership not found',
      );
    });

    it('throws ConflictException when trying to remove the last role', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem-1',
        roles: [{ id: 'mr-1', roleId: 'role-1' }],
      });

      await expect(service.removeRole('mem-1', 'role-1')).rejects.toThrow(ConflictException);
      await expect(service.removeRole('mem-1', 'role-1')).rejects.toThrow(
        'Cannot remove the last role from a member',
      );
      expect(prisma.membershipRole.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when role assignment does not exist', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem-1',
        roles: [
          { id: 'mr-1', roleId: 'role-1' },
          { id: 'mr-2', roleId: 'role-2' },
        ],
      });
      prisma.membershipRole.findUnique.mockResolvedValue(null);

      await expect(service.removeRole('mem-1', 'role-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeRole('mem-1', 'role-nonexistent')).rejects.toThrow(
        'Role assignment not found',
      );
    });

    it('removes role assignment when membership has multiple roles', async () => {
      prisma.membership.findUnique.mockResolvedValue({
        id: 'mem-1',
        roles: [
          { id: 'mr-1', roleId: 'role-1' },
          { id: 'mr-2', roleId: 'role-2' },
        ],
      });
      const assignment = { id: 'mr-2', membershipId: 'mem-1', roleId: 'role-2' };
      prisma.membershipRole.findUnique.mockResolvedValue(assignment);
      prisma.membershipRole.delete.mockResolvedValue(assignment);

      await service.removeRole('mem-1', 'role-2');

      expect(prisma.membershipRole.delete).toHaveBeenCalledWith({ where: { id: 'mr-2' } });
    });
  });

  describe('setOverride', () => {
    it('throws NotFoundException when membership does not exist', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.setOverride('mem-nonexistent', 'brain.read', 'allow')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.setOverride('mem-nonexistent', 'brain.read', 'allow')).rejects.toThrow(
        'Membership not found',
      );
      expect(prisma.membershipPermissionOverride.upsert).not.toHaveBeenCalled();
    });

    it('upserts a permission override when membership exists', async () => {
      const membership = { id: 'mem-1', userId: 'user-1' };
      const override = { id: 'ov-1', membershipId: 'mem-1', key: 'brain.read', effect: 'allow' };

      prisma.membership.findUnique.mockResolvedValue(membership);
      prisma.membershipPermissionOverride.upsert.mockResolvedValue(override);

      const result = await service.setOverride('mem-1', 'brain.read', 'allow');

      expect(prisma.membershipPermissionOverride.upsert).toHaveBeenCalledWith({
        where: { membershipId_key: { membershipId: 'mem-1', key: 'brain.read' } },
        create: { membershipId: 'mem-1', key: 'brain.read', effect: 'allow' },
        update: { effect: 'allow' },
      });
      expect(result).toEqual(override);
    });

    it('sets a deny override correctly', async () => {
      prisma.membership.findUnique.mockResolvedValue({ id: 'mem-1' });
      prisma.membershipPermissionOverride.upsert.mockResolvedValue({});

      await service.setOverride('mem-1', 'role.delete', 'deny');

      const upsertCall = prisma.membershipPermissionOverride.upsert.mock.calls[0][0];
      expect(upsertCall.create.effect).toBe('deny');
      expect(upsertCall.update.effect).toBe('deny');
    });
  });

  describe('removeOverride', () => {
    it('throws NotFoundException when override does not exist', async () => {
      prisma.membershipPermissionOverride.findUnique.mockResolvedValue(null);

      await expect(service.removeOverride('mem-1', 'brain.read')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.removeOverride('mem-1', 'brain.read')).rejects.toThrow(
        'Override not found',
      );
      expect(prisma.membershipPermissionOverride.delete).not.toHaveBeenCalled();
    });

    it('deletes override when it exists', async () => {
      const override = { id: 'ov-1', membershipId: 'mem-1', key: 'brain.read', effect: 'deny' };
      prisma.membershipPermissionOverride.findUnique.mockResolvedValue(override);
      prisma.membershipPermissionOverride.delete.mockResolvedValue(override);

      await service.removeOverride('mem-1', 'brain.read');

      expect(prisma.membershipPermissionOverride.delete).toHaveBeenCalledWith({
        where: { id: 'ov-1' },
      });
    });
  });

  describe('getEffectiveAbility', () => {
    it('throws NotFoundException when membership does not exist', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      await expect(service.getEffectiveAbility('org-1', 'user-nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getEffectiveAbility('org-1', 'user-nonexistent')).rejects.toThrow(
        'Membership not found',
      );
    });

    it('returns ability built from role permissions only when no overrides', async () => {
      const membership = {
        id: 'mem-1',
        roles: [
          {
            role: {
              id: 'role-member',
              permissions: [{ key: 'company.read' }, { key: 'brain.read' }, { key: 'skill.read' }],
            },
          },
        ],
        overrides: [],
      };
      prisma.membership.findUnique.mockResolvedValue(membership);

      const ability = await service.getEffectiveAbility('org-1', 'user-1');

      expect(ability.can('read', 'Company')).toBe(true);
      expect(ability.can('read', 'CompanyBrain')).toBe(true);
      expect(ability.can('read', 'Skill')).toBe(true);
      // permissions not in the role should be denied
      expect(ability.can('update', 'Company')).toBe(false);
    });

    it('applies allow overrides to grant extra permissions', async () => {
      const membership = {
        id: 'mem-1',
        roles: [
          {
            role: {
              id: 'role-member',
              permissions: [{ key: 'company.read' }],
            },
          },
        ],
        overrides: [{ key: 'brain.update', effect: 'allow' }],
      };
      prisma.membership.findUnique.mockResolvedValue(membership);

      const ability = await service.getEffectiveAbility('org-1', 'user-1');

      expect(ability.can('read', 'Company')).toBe(true);
      expect(ability.can('update', 'CompanyBrain')).toBe(true);
    });

    it('applies deny overrides to revoke role permissions', async () => {
      const membership = {
        id: 'mem-1',
        roles: [
          {
            role: {
              id: 'role-admin',
              permissions: [
                { key: 'company.read' },
                { key: 'brain.read' },
                { key: 'brain.update' },
              ],
            },
          },
        ],
        overrides: [{ key: 'brain.update', effect: 'deny' }],
      };
      prisma.membership.findUnique.mockResolvedValue(membership);

      const ability = await service.getEffectiveAbility('org-1', 'user-1');

      expect(ability.can('read', 'CompanyBrain')).toBe(true);
      expect(ability.can('update', 'CompanyBrain')).toBe(false);
    });

    it('correctly merges permissions from multiple roles', async () => {
      const membership = {
        id: 'mem-1',
        roles: [
          {
            role: {
              id: 'role-1',
              permissions: [{ key: 'company.read' }],
            },
          },
          {
            role: {
              id: 'role-2',
              permissions: [{ key: 'brain.update' }],
            },
          },
        ],
        overrides: [],
      };
      prisma.membership.findUnique.mockResolvedValue(membership);

      const ability = await service.getEffectiveAbility('org-1', 'user-1');

      expect(ability.can('read', 'Company')).toBe(true);
      expect(ability.can('update', 'CompanyBrain')).toBe(true);
      expect(ability.can('delete', 'Role')).toBe(false);
    });
  });

  describe('findByOrgAndUser', () => {
    it('returns null when no membership exists', async () => {
      prisma.membership.findUnique.mockResolvedValue(null);

      const result = await service.findByOrgAndUser('org-1', 'user-1');

      expect(result).toBeNull();
    });

    it('returns membership when found', async () => {
      const membership = {
        id: 'mem-1',
        userId: 'user-1',
        organizationId: 'org-1',
        roles: [],
        overrides: [],
      };
      prisma.membership.findUnique.mockResolvedValue(membership);

      const result = await service.findByOrgAndUser('org-1', 'user-1');

      expect(result).toEqual(membership);
      expect(prisma.membership.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_organizationId: { userId: 'user-1', organizationId: 'org-1' } },
        }),
      );
    });
  });

  describe('findByOrganization', () => {
    it('returns empty array when no members', async () => {
      prisma.membership.findMany.mockResolvedValue([]);

      const result = await service.findByOrganization('org-1');

      expect(result).toEqual([]);
    });
  });
});
