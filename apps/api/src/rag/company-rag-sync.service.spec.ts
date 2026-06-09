import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentService } from './document.service';
import { IngestionService } from './ingestion.service';
import { RagEventsService } from './rag-events.service';
import { CompanyRagSyncService } from './company-rag-sync.service';
import { hashRagContent, serializeBrandProfile } from './brand-brain.serializer';

const makeBrandProfile = () => ({
  id: 'brand-1',
  companyId: 'company-1',
  brandVoice: 'Friendly',
  niche: 'Bakery',
  description: 'Local bakery',
  targetAudience: 'Families',
  mainProducts: 'Cakes',
  differentiators: 'Fresh ingredients',
  visualStyle: 'Warm',
  typography: 'Sans',
  marketingObjective: 'AWARENESS' as const,
  socialNetworks: ['instagram'],
  palette: {},
  logoVariants: {},
  logoStorageKey: null,
  brandAssets: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('CompanyRagSyncService', () => {
  let service: CompanyRagSyncService;
  let prisma: {
    company: { findUnique: jest.Mock };
  };
  let documentService: { findBySource: jest.Mock };
  let ingestionService: { ingest: jest.Mock };
  let ragEvents: { triggerCompanySync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      company: { findUnique: jest.fn() },
    };
    documentService = { findBySource: jest.fn() };
    ingestionService = { ingest: jest.fn() };
    ragEvents = { triggerCompanySync: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyRagSyncService,
        { provide: PrismaService, useValue: prisma },
        { provide: DocumentService, useValue: documentService },
        { provide: IngestionService, useValue: ingestionService },
        { provide: RagEventsService, useValue: ragEvents },
      ],
    }).compile();

    service = module.get(CompanyRagSyncService);
  });

  it('reports synced when indexed hash matches brand profile', async () => {
    const brandProfile = makeBrandProfile();
    const content = serializeBrandProfile(brandProfile, 'Acme');
    const contentHash = hashRagContent(content);

    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      brandProfile,
      campaigns: [],
      campaignFiles: [],
    });
    documentService.findBySource.mockResolvedValue({
      id: 'doc-1',
      status: 'INDEXED',
      contentHash,
      metadata: { contentHash },
    });

    const status = await service.getSyncStatus('company-1');

    expect(status.isSynced).toBe(true);
    expect(status.staleCount).toBe(0);
    expect(status.sources).toHaveLength(1);
    expect(status.sources[0]?.state).toBe('synced');
  });

  it('reports stale when brand profile changed', async () => {
    const brandProfile = makeBrandProfile();
    const content = serializeBrandProfile(brandProfile, 'Acme');

    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      brandProfile,
      campaigns: [],
      campaignFiles: [],
    });
    documentService.findBySource.mockResolvedValue({
      id: 'doc-1',
      status: 'INDEXED',
      contentHash: 'old-hash',
      metadata: { contentHash: 'old-hash' },
    });

    const status = await service.getSyncStatus('company-1');

    expect(status.isSynced).toBe(false);
    expect(status.sources[0]?.state).toBe('stale');
    expect(status.sources[0]?.contentHash).toBe(hashRagContent(content));
  });

  it('ingests stale sources inline during ensureSynced', async () => {
    const brandProfile = makeBrandProfile();

    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      brandProfile,
      campaigns: [],
      campaignFiles: [],
    });
    documentService.findBySource.mockResolvedValue(null);
    ingestionService.ingest.mockResolvedValue({
      documentId: 'doc-2',
      chunksCreated: 1,
      embeddingsCreated: 1,
      status: 'created',
    });

    const result = await service.ensureSynced('company-1');

    expect(result.mode).toBe('inline');
    expect(result.syncedSources).toBe(1);
    expect(ingestionService.ingest).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'company-1',
        sourceType: 'BRAND_BRAIN',
        sourceId: 'brand-1',
        forceReindex: true,
      }),
    );
  });

  it('queues async sync when requested', async () => {
    const brandProfile = makeBrandProfile();

    prisma.company.findUnique.mockResolvedValue({
      id: 'company-1',
      name: 'Acme',
      brandProfile,
      campaigns: [],
      campaignFiles: [],
    });
    documentService.findBySource.mockResolvedValue(null);
    ragEvents.triggerCompanySync.mockResolvedValue('job-1');

    const result = await service.ensureSynced('company-1', { async: true });

    expect(result.mode).toBe('queued');
    expect(result.jobId).toBe('job-1');
    expect(ingestionService.ingest).not.toHaveBeenCalled();
  });

  it('throws when company does not exist', async () => {
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(service.getSyncStatus('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
