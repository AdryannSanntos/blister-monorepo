import { Test, type TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceContextService } from './workspace-context.service';

const makeMockPrisma = () => {
  const user = { findUnique: jest.fn() };
  const workspaceSettings = { create: jest.fn() };
  const workspaceFolder = { create: jest.fn(), findFirst: jest.fn() };
  const company = { findUnique: jest.fn(), findMany: jest.fn() };
  const companyMember = { findMany: jest.fn() };
  const platformCreditSettings = { findUnique: jest.fn() };

  return {
    user,
    workspaceSettings,
    workspaceFolder,
    company,
    companyMember,
    platformCreditSettings,
    $transaction: jest.fn((cb: (tx: unknown) => unknown) =>
      cb({
        workspaceSettings,
        workspaceFolder,
        platformCreditSettings,
      }),
    ),
  };
};

describe('WorkspaceContextService', () => {
  let service: WorkspaceContextService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspaceContextService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(WorkspaceContextService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('resolveFromRequest', () => {
    it('throws BadRequestException when no active company cookie is present', async () => {
      await expect(
        service.resolveFromRequest('user-1', {
          cookies: {},
          headers: {},
        } as never),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns company workspace when valid company id is active', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'co-1',
        ownerUserId: 'user-1',
        onboardingCompletedAt: new Date(),
        members: [],
      });

      const result = await service.resolveFromRequest('user-1', {
        cookies: { 'blister-active-company-id': 'co-1' },
        headers: {},
      } as never);

      expect(result).toEqual({
        type: 'company',
        companyId: 'co-1',
        userId: 'user-1',
      });
    });

    it('throws when company is not accessible', async () => {
      prisma.company.findUnique.mockResolvedValue(null);

      await expect(
        service.resolveFromRequest('user-1', {
          cookies: { 'blister-active-company-id': 'co-unknown' },
          headers: {},
        } as never),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assertCompanyAccess', () => {
    it('allows owner access', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'co-1',
        ownerUserId: 'user-1',
        onboardingCompletedAt: new Date(),
        members: [],
      });

      await expect(service.assertCompanyAccess('user-1', 'co-1')).resolves.toBeDefined();
    });

    it('denies non-member access', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'co-1',
        ownerUserId: 'other-user',
        onboardingCompletedAt: new Date(),
        members: [],
      });

      await expect(service.assertCompanyAccess('user-1', 'co-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
