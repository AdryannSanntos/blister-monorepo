import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { DesignSystemSyncService } from './design-system-sync.service';
import { DesignSystemService } from './design-system.service';

const makeMockPrisma = () => ({
  designSystemProfile: {
    upsert: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  designColorGroup: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  designColorToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  designAsset: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('DesignSystemService', () => {
  let service: DesignSystemService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let sync: { enqueueDesignSystemSync: jest.Mock };
  let storage: { buildDesignAssetKey: jest.Mock; buildPublicObjectUrl: jest.Mock; createPresignedUploadUrl: jest.Mock; deleteObject: jest.Mock };

  beforeEach(async () => {
    prisma = makeMockPrisma();
    sync = { enqueueDesignSystemSync: jest.fn() };
    storage = {
      buildDesignAssetKey: jest.fn(() => 'organizations/org-1/design-system/assets/logo/logo.png'),
      buildPublicObjectUrl: jest.fn(() => 'https://assets.test/logo.png'),
      createPresignedUploadUrl: jest.fn().mockResolvedValue({ url: 'https://upload.test/logo.png' }),
      deleteObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DesignSystemService,
        { provide: PrismaService, useValue: prisma },
        { provide: DesignSystemSyncService, useValue: sync },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    service = module.get(DesignSystemService);
  });

  it('returns an existing profile or creates an empty profile for the organization', async () => {
    prisma.designSystemProfile.upsert.mockResolvedValue({ id: 'profile-1', colorGroups: [], assets: [] });

    const result = await service.getDesignSystem('org-1');

    expect(prisma.designSystemProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
    expect(result.id).toBe('profile-1');
  });

  it('updates identity fields and enqueues artifact sync', async () => {
    prisma.designSystemProfile.upsert.mockResolvedValue({ id: 'profile-1' });
    prisma.designSystemProfile.update.mockResolvedValue({ id: 'profile-1', brandEssence: 'Nova marca' });

    await service.updateIdentity('org-1', { brandEssence: 'Nova marca' });

    expect(prisma.designSystemProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
    expect(sync.enqueueDesignSystemSync).toHaveBeenCalledWith('org-1');
  });

  it('creates color groups under the organization design system', async () => {
    prisma.designSystemProfile.upsert.mockResolvedValue({ id: 'profile-1' });
    prisma.designColorGroup.create.mockResolvedValue({ id: 'group-1', name: 'Primarias' });

    const result = await service.createColorGroup('org-1', { name: 'Primarias' });

    expect(prisma.designColorGroup.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ designSystemId: 'profile-1' }) }),
    );
    expect(result.id).toBe('group-1');
  });

  it('throws when updating a color group outside the organization', async () => {
    prisma.designColorGroup.findFirst.mockResolvedValue(null);

    await expect(service.updateColorGroup('org-1', 'missing', { name: 'Core' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('creates presigned upload URLs using the standard design asset key', async () => {
    const result = await service.createAssetUploadUrl('org-1', {
      assetId: 'asset-1',
      primaryRole: 'logo',
      fileName: 'logo.png',
      contentType: 'image/png',
      size: 1024,
    });

    expect(storage.buildDesignAssetKey).toHaveBeenCalledWith('org-1', 'logo', 'logo.png');
    expect(result).toEqual({
      key: 'organizations/org-1/design-system/assets/logo/logo.png',
      url: 'https://upload.test/logo.png',
    });
  });

  it('deletes the S3 object when deleting a registered design asset', async () => {
    prisma.designAsset.findFirst.mockResolvedValue({ id: 'asset-1', objectKey: 'object-key' });

    await service.deleteAsset('org-1', 'asset-1');

    expect(storage.deleteObject).toHaveBeenCalledWith('object-key');
    expect(prisma.designAsset.delete).toHaveBeenCalledWith({ where: { id: 'asset-1' } });
  });
});
