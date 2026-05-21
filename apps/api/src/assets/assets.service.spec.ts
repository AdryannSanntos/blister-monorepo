import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from './assets.service';
import type { BulkUpdateAssetsDto, CreateAssetDto, UpdateAssetDto } from './dto';

const makeMockPrisma = () => ({
  asset: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  assetRelation: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn(),
});

type MockPrisma = ReturnType<typeof makeMockPrisma>;

describe('AssetsService', () => {
  let service: AssetsService;
  let prisma: MockPrisma;

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [AssetsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAsset', () => {
    it('creates a context source asset', async () => {
      const dto: CreateAssetDto = {
        title: 'Brand Book 2026',
        sourceKind: 'url',
        sourceUrl: 'https://acme.test/brand-book',
        visibleType: 'document',
        visibleCategory: 'brand',
        tags: [],
        contextRole: true,
        operationalRole: false,
        relations: [],
      };

      prisma.asset.create.mockResolvedValue({
        id: 'asset-1',
        organizationId: 'org-1',
        ...dto,
        description: null,
        fileName: null,
        mimeType: null,
        tags: [],
        contextStatus: 'uploaded',
        operationalStatus: null,
        relations: [],
      });

      const result = await service.createAsset('org-1', dto);

      expect(prisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            contextRole: true,
            operationalRole: false,
            contextStatus: 'uploaded',
          }),
        }),
      );
      expect(result.contextRole).toBe(true);
      expect(result.operationalRole).toBe(false);
    });

    it('creates an operational asset', async () => {
      const dto: CreateAssetDto = {
        title: 'Approved LinkedIn Carousel',
        sourceKind: 'file',
        fileName: 'linkedin-carousel.png',
        mimeType: 'image/png',
        visibleType: 'image',
        visibleCategory: 'published-content',
        tags: [],
        contextRole: false,
        operationalRole: true,
        relations: [],
      };

      prisma.asset.create.mockResolvedValue({
        id: 'asset-2',
        organizationId: 'org-1',
        ...dto,
        description: null,
        sourceUrl: null,
        tags: [],
        contextStatus: null,
        operationalStatus: 'active',
        relations: [],
      });

      const result = await service.createAsset('org-1', dto);

      expect(prisma.asset.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: 'org-1',
            contextRole: false,
            operationalRole: true,
            operationalStatus: 'active',
          }),
        }),
      );
      expect(result.operationalRole).toBe(true);
      expect(result.contextRole).toBe(false);
    });
  });

  describe('listAssets', () => {
    it('lists only context assets when the role filter is context', async () => {
      prisma.asset.findMany.mockResolvedValue([]);

      await service.listAssets('org-1', { role: 'context' });

      expect(prisma.asset.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            contextRole: true,
          }),
        }),
      );
    });
  });

  describe('updateAsset', () => {
    it('updates visible fields only', async () => {
      prisma.asset.findFirst.mockResolvedValue({
        id: 'asset-1',
        organizationId: 'org-1',
        contextRole: true,
        operationalRole: true,
      });
      prisma.asset.update.mockResolvedValue({
        id: 'asset-1',
        title: 'Updated Brand Book',
        visibleCategory: 'brand',
        visibleType: 'document',
      });

      const dto: UpdateAssetDto = {
        title: 'Updated Brand Book',
        visibleCategory: 'brand',
      };

      await service.updateAsset('org-1', 'asset-1', dto);

      expect(prisma.asset.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: 'Updated Brand Book',
            visibleCategory: 'brand',
          }),
        }),
      );
    });

    it('throws when the asset does not exist in the organization', async () => {
      prisma.asset.findFirst.mockResolvedValue(null);

      await expect(service.updateAsset('org-1', 'missing', { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkUpdateAssets', () => {
    it('marks a context asset as discarded without deleting it', async () => {
      prisma.asset.updateMany.mockResolvedValue({ count: 1 });

      const dto: BulkUpdateAssetsDto = {
        assetIds: ['asset-1'],
        action: 'discard_context',
      };

      await service.bulkUpdateAssets('org-1', dto);

      expect(prisma.asset.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['asset-1'] }, organizationId: 'org-1' },
        data: { contextStatus: 'discarded' },
      });
    });

    it('promotes an operational asset into context role without duplication', async () => {
      prisma.asset.updateMany.mockResolvedValue({ count: 1 });

      const dto: BulkUpdateAssetsDto = {
        assetIds: ['asset-2'],
        action: 'promote_to_context',
      };

      await service.bulkUpdateAssets('org-1', dto);

      expect(prisma.asset.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['asset-2'] }, organizationId: 'org-1' },
        data: { contextRole: true, contextStatus: 'uploaded' },
      });
    });

    it('rejects relation replacement when any asset is outside the organization', async () => {
      prisma.asset.findMany.mockResolvedValue([{ id: 'asset-1' }]);
      prisma.$transaction.mockImplementation(async (callback) => callback(prisma));

      await expect(
        service.bulkUpdateAssets('org-1', {
          assetIds: ['asset-1', 'asset-2'],
          action: 'replace_relations',
          relations: [{ kind: 'campaign', value: 'Launch' }],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(prisma.assetRelation.deleteMany).not.toHaveBeenCalled();
      expect(prisma.asset.update).not.toHaveBeenCalled();
    });
  });
});
