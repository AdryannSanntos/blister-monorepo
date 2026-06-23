import { UnprocessableEntityException } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service';

const enabledModel = (capabilities: string[]) => ({
  id: 'm1',
  isEnabled: true,
  capabilities,
  provider: { isEnabled: true },
});

const createService = (overrides: {
  aiModel?: unknown;
}) => {
  const prisma = {
    aiModel: { findUnique: jest.fn().mockResolvedValue(overrides.aiModel ?? null) },
    ragPlatformSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockImplementation(({ create }) => Promise.resolve(create)),
    },
    platformCreditSettings: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const audit = { write: jest.fn().mockResolvedValue(undefined) };
  const service = new PlatformSettingsService(
    prisma as never,
    audit as never,
  );
  return { service, prisma, audit };
};

describe('PlatformSettingsService.updateRagSettings', () => {
  it('rejects an embedding slot model lacking the embedding capability (422)', async () => {
    const { service } = createService({ aiModel: enabledModel(['text']) });
    await expect(
      service.updateRagSettings('admin-1', { embeddingModelId: 'm1' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a caption slot model lacking the text capability (422)', async () => {
    const { service } = createService({ aiModel: enabledModel(['embedding']) });
    await expect(
      service.updateRagSettings('admin-1', { captionModelId: 'm1' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects a disabled / missing model (422)', async () => {
    const { service } = createService({ aiModel: null });
    await expect(
      service.updateRagSettings('admin-1', { embeddingModelId: 'gone' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('persists and audits valid settings', async () => {
    const { service, prisma, audit } = createService({
      aiModel: enabledModel(['embedding']),
    });
    const result = await service.updateRagSettings('admin-1', {
      embeddingModelId: 'm1',
      chunkSize: 1024,
      rerankEnabled: false,
    });
    expect(prisma.ragPlatformSettings.upsert).toHaveBeenCalled();
    expect(audit.write).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'platform.rag_settings_updated' }),
    );
    expect(result).toMatchObject({ embeddingModelId: 'm1', chunkSize: 1024 });
  });

  it('allows numeric-only updates without touching models', async () => {
    const { service, prisma } = createService({});
    await service.updateRagSettings('admin-1', { topK: 12 });
    expect(prisma.aiModel.findUnique).not.toHaveBeenCalled();
    expect(prisma.ragPlatformSettings.upsert).toHaveBeenCalled();
  });
});
