import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';

const makeMockAssetsService = () => ({
  listAssets: jest.fn(),
  getAssetById: jest.fn(),
  createAsset: jest.fn(),
  updateAsset: jest.fn(),
  bulkUpdateAssets: jest.fn(),
});

describe('AssetsController', () => {
  let controller: AssetsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [{ provide: AssetsService, useValue: makeMockAssetsService() }],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  it('rejects invalid bulk payloads', async () => {
    await expect(
      controller.bulkUpdateAssets('org-1', { action: 'archive' }, {} as Request),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires context review ability for context review bulk actions', async () => {
    const req = {
      orgContext: {
        ability: {
          can: jest.fn().mockReturnValue(false),
        },
      },
    };

    await expect(
      controller.bulkUpdateAssets(
        'org-1',
        { assetIds: ['asset-1'], action: 'approve_context' },
        req as unknown as Request,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(req.orgContext.ability.can).toHaveBeenCalledWith('update', 'ContextAsset');
  });

  it('requires archive ability for archive bulk actions', async () => {
    const req = {
      orgContext: {
        ability: {
          can: jest.fn().mockReturnValue(false),
        },
      },
    };

    await expect(
      controller.bulkUpdateAssets(
        'org-1',
        { assetIds: ['asset-1'], action: 'archive' },
        req as unknown as Request,
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(req.orgContext.ability.can).toHaveBeenCalledWith('delete', 'Asset');
  });
});
