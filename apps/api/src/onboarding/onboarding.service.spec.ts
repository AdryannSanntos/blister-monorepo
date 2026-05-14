import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { MembershipService } from '../organization/membership.service';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardingService } from './onboarding.service';

const makeMockPrisma = () => ({
  onboardingDraft: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
  },
});

const makeMockMembershipService = () => ({
  findByOrgAndUser: jest.fn(),
  findByOrganization: jest.fn(),
  addRole: jest.fn(),
  removeRole: jest.fn(),
  setOverride: jest.fn(),
  removeOverride: jest.fn(),
  getEffectiveAbility: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;
type MockMembershipService = ReturnType<typeof makeMockMembershipService>;

describe('OnboardingService', () => {
  let service: OnboardingService;
  let prisma: MockPrisma;
  let membershipService: MockMembershipService;

  beforeEach(async () => {
    prisma = makeMockPrisma();
    membershipService = makeMockMembershipService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: MembershipService, useValue: membershipService },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDraft', () => {
    it('returns null when no draft exists', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue(null);

      const result = await service.getDraft('org-1');

      expect(result).toBeNull();
      expect(prisma.onboardingDraft.findUnique).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });

    it('returns the draft when it exists', async () => {
      const draft = {
        id: 'draft-1',
        organizationId: 'org-1',
        currentStep: 3,
        data: { 'company-basics': { name: 'Acme' } },
        publishedAt: null,
      };
      prisma.onboardingDraft.findUnique.mockResolvedValue(draft);

      const result = await service.getDraft('org-1');

      expect(result).toEqual(draft);
    });
  });

  describe('upsertDraft', () => {
    it('creates a new draft when none exists', async () => {
      const dto = { currentStep: 1, data: { welcome: { seen: true } } };
      const created = { id: 'draft-1', organizationId: 'org-1', ...dto, publishedAt: null };
      prisma.onboardingDraft.upsert.mockResolvedValue(created);

      const result = await service.upsertDraft('org-1', dto);

      expect(result).toEqual(created);
      expect(prisma.onboardingDraft.upsert).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        create: { organizationId: 'org-1', currentStep: 1, data: dto.data },
        update: { currentStep: 1, data: dto.data },
      });
    });

    it('updates existing draft', async () => {
      const dto = {
        currentStep: 5,
        data: { welcome: { seen: true }, positioning: { value: 'test' } },
      };
      const updated = { id: 'draft-1', organizationId: 'org-1', ...dto, publishedAt: null };
      prisma.onboardingDraft.upsert.mockResolvedValue(updated);

      const result = await service.upsertDraft('org-1', dto);

      expect(result.currentStep).toBe(5);
    });
  });

  describe('publish', () => {
    it('throws NotFoundException when draft does not exist', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue(null);

      await expect(service.publish('org-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when already published', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        organizationId: 'org-1',
        publishedAt: new Date(),
      });

      await expect(service.publish('org-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when membership does not exist', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        organizationId: 'org-1',
        publishedAt: null,
      });
      membershipService.getEffectiveAbility.mockRejectedValue(
        new NotFoundException('Membership not found'),
      );

      await expect(service.publish('org-1', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user lacks permission to publish onboarding', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        organizationId: 'org-1',
        publishedAt: null,
      });
      membershipService.getEffectiveAbility.mockResolvedValue({
        can: jest.fn().mockReturnValue(false),
      });

      await expect(service.publish('org-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('publishes when user has CASL permission to publish onboarding', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({
        id: 'draft-1',
        organizationId: 'org-1',
        publishedAt: null,
      });
      membershipService.getEffectiveAbility.mockResolvedValue({
        can: jest.fn().mockImplementation((action: string, subject: string) => {
          return action === 'update' && subject === 'Onboarding';
        }),
      });
      const published = {
        id: 'draft-1',
        organizationId: 'org-1',
        publishedAt: new Date(),
      };
      prisma.onboardingDraft.update.mockResolvedValue(published);

      const result = await service.publish('org-1', 'user-1');

      expect(result.publishedAt).toBeDefined();
      expect(prisma.onboardingDraft.update).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        data: { publishedAt: expect.any(Date) },
      });
      expect(membershipService.getEffectiveAbility).toHaveBeenCalledWith('org-1', 'user-1');
    });
  });

  describe('isPublished', () => {
    it('returns false when no draft exists', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue(null);

      const result = await service.isPublished('org-1');

      expect(result).toBe(false);
    });

    it('returns false when draft exists but not published', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({ publishedAt: null });

      const result = await service.isPublished('org-1');

      expect(result).toBe(false);
    });

    it('returns true when draft is published', async () => {
      prisma.onboardingDraft.findUnique.mockResolvedValue({ publishedAt: new Date() });

      const result = await service.isPublished('org-1');

      expect(result).toBe(true);
    });
  });
});
