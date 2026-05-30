import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ContextSyncService } from './context-sync.service';
import { ContextService } from './context.service';

const makeMockPrisma = () => ({
  contextSource: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contextArtifact: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
});

describe('ContextService', () => {
  let service: ContextService;
  let prisma: ReturnType<typeof makeMockPrisma>;
  let storage: {
    buildContextSourceKey: jest.Mock;
    buildPublicObjectUrl: jest.Mock;
    createPresignedUploadUrl: jest.Mock;
    putObject: jest.Mock;
    deleteObject: jest.Mock;
  };
  let syncService: {
    enqueueSourceIngest: jest.Mock;
    enqueueArtifactSync: jest.Mock;
  };

  beforeEach(async () => {
    prisma = makeMockPrisma();
    storage = {
      buildContextSourceKey: jest.fn(() => 'organizations/org-1/context/sources/source-1/file.pdf'),
      buildPublicObjectUrl: jest.fn(() => 'https://assets.test/file.pdf'),
      createPresignedUploadUrl: jest.fn().mockResolvedValue({ url: 'https://upload.test/file.pdf' }),
      putObject: jest.fn(),
      deleteObject: jest.fn(),
    };
    syncService = {
      enqueueSourceIngest: jest.fn(),
      enqueueArtifactSync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContextService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storage },
        { provide: ContextSyncService, useValue: syncService },
      ],
    }).compile();

    service = module.get(ContextService);
  });

  it('uploads a context source file through the backend storage service', async () => {
    const result = await service.uploadSourceFile('org-1', {
      fileName: 'file.pdf',
      contentType: 'application/pdf',
      size: 2048,
      body: Buffer.from('pdf-bytes'),
    });

    expect(storage.buildContextSourceKey).toHaveBeenCalledWith('org-1', expect.any(String), 'file.pdf');
    expect(storage.putObject).toHaveBeenCalledWith({
      key: 'organizations/org-1/context/sources/source-1/file.pdf',
      body: Buffer.from('pdf-bytes'),
      contentType: 'application/pdf',
    });
    expect(result).toEqual({
      objectKey: 'organizations/org-1/context/sources/source-1/file.pdf',
      publicUrl: 'https://assets.test/file.pdf',
    });
  });
});
