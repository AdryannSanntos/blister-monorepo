import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService, type WriteAuditLogInput } from './audit.service';

const makeMockPrisma = () => ({
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('AuditService', () => {
  let service: AuditService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('write', () => {
    it('creates an audit log entry with all required fields', async () => {
      const input: WriteAuditLogInput = {
        actorUserId: 'actor-1',
        action: 'assign_platform_role',
        resourceType: 'PlatformRoleAssignment',
        resourceId: 'a-1',
        metadata: { role: 'platform_admin' },
      };
      const log = { id: 'log-1', ...input, createdAt: new Date() };
      prisma.auditLog.create.mockResolvedValue(log);

      const result = await service.write(input);

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorUserId: 'actor-1',
          targetUserId: null,
          action: 'assign_platform_role',
          resourceType: 'PlatformRoleAssignment',
          resourceId: 'a-1',
          metadata: { role: 'platform_admin' },
        },
      });
      expect(result).toEqual(log);
    });

    it('creates audit log with targetUserId when provided', async () => {
      const input: WriteAuditLogInput = {
        actorUserId: 'actor-1',
        targetUserId: 'user-1',
        action: 'start_support_session',
        resourceType: 'SupportSession',
        resourceId: 'sess-1',
      };
      prisma.auditLog.create.mockResolvedValue({});

      await service.write(input);

      const callArg = prisma.auditLog.create.mock.calls[0][0];
      expect(callArg.data.targetUserId).toBe('user-1');
      expect(callArg.data.metadata).toEqual({});
    });

    it('defaults metadata to empty object when not provided', async () => {
      prisma.auditLog.create.mockResolvedValue({});

      await service.write({
        actorUserId: 'actor-1',
        action: 'some_action',
        resourceType: 'SomeResource',
        resourceId: 'res-1',
      });

      const callArg = prisma.auditLog.create.mock.calls[0][0];
      expect(callArg.data.metadata).toEqual({});
    });
  });

  describe('findByActor', () => {
    it('returns audit logs for a given actor', async () => {
      const logs = [{ id: 'log-1', actorUserId: 'actor-1' }];
      prisma.auditLog.findMany.mockResolvedValue(logs);

      const result = await service.findByActor('actor-1');

      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { actorUserId: 'actor-1' } }),
      );
      expect(result).toEqual(logs);
    });

    it('returns empty array when no logs exist for actor', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);

      const result = await service.findByActor('nobody');

      expect(result).toEqual([]);
    });
  });
});
