import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformService } from './platform.service';

const makeMockPrisma = () => ({
  platformRoleAssignment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  supportSession: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('PlatformService', () => {
  let service: PlatformService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [PlatformService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<PlatformService>(PlatformService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // listPlatformAdmins
  // -------------------------------------------------------------------------

  describe('listPlatformAdmins', () => {
    it('returns all platform role assignments', async () => {
      const assignments = [
        { id: 'a-1', userId: 'u-1', role: 'platform_admin', assignedBy: 'u-0', assignedAt: new Date() },
      ];
      prisma.platformRoleAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.listPlatformAdmins();

      expect(prisma.platformRoleAssignment.findMany).toHaveBeenCalled();
      expect(result).toEqual(assignments);
    });
  });

  // -------------------------------------------------------------------------
  // assignPlatformRole
  // -------------------------------------------------------------------------

  describe('assignPlatformRole', () => {
    it('assigns platform_admin to a user', async () => {
      const assignment = {
        id: 'a-1',
        userId: 'u-1',
        role: 'platform_admin',
        assignedBy: 'actor-1',
        assignedAt: new Date(),
      };
      prisma.platformRoleAssignment.findUnique.mockResolvedValue(null);
      prisma.platformRoleAssignment.create.mockResolvedValue(assignment);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.assignPlatformRole('actor-1', {
        userId: 'u-1',
        role: 'platform_admin',
      });

      expect(prisma.platformRoleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u-1',
            role: 'platform_admin',
            assignedBy: 'actor-1',
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: 'actor-1',
            action: 'assign_platform_role',
          }),
        }),
      );
      expect(result).toEqual(assignment);
    });

    it('rejects unsupported platform role', async () => {
      await expect(
        service.assignPlatformRole('actor-1', {
          userId: 'u-1',
          role: 'invalid_role' as never,
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.platformRoleAssignment.create).not.toHaveBeenCalled();
    });

    it('does not depend on organization membership', async () => {
      // This test verifies that platform role assignment has no membership query.
      // The mock prisma only has platformRoleAssignment, supportSession, and auditLog defined.
      // If the service tried to access any membership/organization table it would throw.
      const assignment = {
        id: 'a-1',
        userId: 'u-999',
        role: 'platform_admin',
        assignedBy: 'actor-1',
        assignedAt: new Date(),
      };
      prisma.platformRoleAssignment.findUnique.mockResolvedValue(null);
      prisma.platformRoleAssignment.create.mockResolvedValue(assignment);
      prisma.auditLog.create.mockResolvedValue({});

      // Should succeed without any membership/organization table access
      const result = await service.assignPlatformRole('actor-1', {
        userId: 'u-999',
        role: 'platform_admin',
      });

      expect(result).toEqual(assignment);
      // Only platformRoleAssignment tables were accessed
      expect(prisma.platformRoleAssignment.create).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // removePlatformRole
  // -------------------------------------------------------------------------

  describe('removePlatformRole', () => {
    it('removes a platform role assignment by id', async () => {
      const assignment = {
        id: 'a-1',
        userId: 'u-1',
        role: 'platform_admin',
        assignedBy: 'actor-0',
        assignedAt: new Date(),
      };
      prisma.platformRoleAssignment.findUnique.mockResolvedValue(assignment);
      prisma.platformRoleAssignment.delete.mockResolvedValue(assignment);
      prisma.auditLog.create.mockResolvedValue({});

      await service.removePlatformRole('actor-1', 'a-1');

      expect(prisma.platformRoleAssignment.delete).toHaveBeenCalledWith({ where: { id: 'a-1' } });
    });

    it('throws NotFoundException when assignment does not exist', async () => {
      prisma.platformRoleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.removePlatformRole('actor-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.platformRoleAssignment.delete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // startSupportSession
  // -------------------------------------------------------------------------

  describe('startSupportSession', () => {
    it('starts a support session with audited reason', async () => {
      const session = {
        id: 'sess-1',
        actorUserId: 'actor-1',
        organizationId: 'org-1',
        reason: 'Helping client with issue',
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      };
      prisma.supportSession.create.mockResolvedValue(session);
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.startSupportSession('actor-1', {
        organizationId: 'org-1',
        reason: 'Helping client with issue',
      });

      expect(prisma.supportSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: 'actor-1',
            organizationId: 'org-1',
            reason: 'Helping client with issue',
            status: 'active',
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorUserId: 'actor-1',
            targetOrganizationId: 'org-1',
            action: 'start_support_session',
          }),
        }),
      );
      expect(result).toEqual(session);
    });

    it('does not start session without a reason', async () => {
      await expect(
        service.startSupportSession('actor-1', {
          organizationId: 'org-1',
          reason: 'short', // less than 8 chars
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prisma.supportSession.create).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // endSupportSession
  // -------------------------------------------------------------------------

  describe('endSupportSession', () => {
    it('ends an active support session', async () => {
      const session = {
        id: 'sess-1',
        actorUserId: 'actor-1',
        organizationId: 'org-1',
        status: 'active',
      };
      prisma.supportSession.findUnique.mockResolvedValue(session);
      prisma.supportSession.update.mockResolvedValue({ ...session, status: 'ended', endedAt: new Date() });
      prisma.auditLog.create.mockResolvedValue({});

      await service.endSupportSession('actor-1', 'sess-1');

      expect(prisma.supportSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sess-1' },
          data: expect.objectContaining({ status: 'ended' }),
        }),
      );
    });

    it('throws NotFoundException when session does not exist', async () => {
      prisma.supportSession.findUnique.mockResolvedValue(null);

      await expect(service.endSupportSession('actor-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.supportSession.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when actor is not the session owner', async () => {
      prisma.supportSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        actorUserId: 'another-user',
        status: 'active',
      });

      await expect(service.endSupportSession('actor-1', 'sess-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.supportSession.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when session is already ended', async () => {
      prisma.supportSession.findUnique.mockResolvedValue({
        id: 'sess-1',
        actorUserId: 'actor-1',
        status: 'ended',
      });

      await expect(service.endSupportSession('actor-1', 'sess-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.supportSession.update).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // getUserPlatformRoles
  // -------------------------------------------------------------------------

  describe('getUserPlatformRoles', () => {
    it('returns all platform roles for a user', async () => {
      const assignments = [
        { id: 'a-1', userId: 'u-1', role: 'platform_admin', assignedBy: 'actor-0', assignedAt: new Date() },
      ];
      prisma.platformRoleAssignment.findMany.mockResolvedValue(assignments);

      const result = await service.getUserPlatformRoles('u-1');

      expect(prisma.platformRoleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u-1' } }),
      );
      expect(result).toEqual(assignments);
    });

    it('returns empty array when user has no platform roles', async () => {
      prisma.platformRoleAssignment.findMany.mockResolvedValue([]);

      const result = await service.getUserPlatformRoles('u-nobody');

      expect(result).toEqual([]);
    });
  });
});
