import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { RagSourceType } from '@company-os/types';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentService } from './document.service';
import { IngestionService } from './ingestion.service';
import { RagEventsService } from './rag-events.service';
import { CaptionService } from './caption.service';
import {
  hashRagContent,
  serializeBrandProfile,
  serializeCampaign,
  serializeCampaignFile,
} from './brand-brain.serializer';

export type RagSourceSyncState = 'synced' | 'stale' | 'missing' | 'failed' | 'indexing';

export interface RagSourceSyncItem {
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  state: RagSourceSyncState;
  contentHash: string;
}

export interface CompanyRagSyncStatus {
  companyId: string;
  isSynced: boolean;
  sources: RagSourceSyncItem[];
  staleCount: number;
}

export interface EnsureCompanyRagSyncOptions {
  campaignId?: string;
  async?: boolean;
}

export interface EnsureCompanyRagSyncResult {
  companyId: string;
  isSynced: boolean;
  syncedSources: number;
  skippedSources: number;
  failedSources: number;
  mode: 'inline' | 'queued';
  jobId?: string;
}

@Injectable()
export class CompanyRagSyncService {
  private readonly logger = new Logger(CompanyRagSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService,
    private readonly ingestionService: IngestionService,
    private readonly ragEvents: RagEventsService,
    private readonly captionService: CaptionService,
  ) {}

  async getSyncStatus(
    companyId: string,
    campaignId?: string,
  ): Promise<CompanyRagSyncStatus> {
    const sources = await this.collectExpectedSources(companyId, campaignId);
    const items: RagSourceSyncItem[] = [];

    for (const source of sources) {
      const state = await this.resolveSourceState(
        companyId,
        source.sourceType,
        source.sourceId,
        source.content,
      );
      items.push({
        sourceType: source.sourceType,
        sourceId: source.sourceId,
        title: source.title,
        state,
        contentHash: hashRagContent(source.content),
      });
    }

    const staleCount = items.filter((item) => item.state !== 'synced').length;

    return {
      companyId,
      isSynced: staleCount === 0,
      sources: items,
      staleCount,
    };
  }

  async ensureSynced(
    companyId: string,
    options?: EnsureCompanyRagSyncOptions,
  ): Promise<EnsureCompanyRagSyncResult> {
    const status = await this.getSyncStatus(companyId, options?.campaignId);
    if (status.isSynced) {
      return {
        companyId,
        isSynced: true,
        syncedSources: 0,
        skippedSources: status.sources.length,
        failedSources: 0,
        mode: 'inline',
      };
    }

    if (options?.async) {
      const jobId = await this.ragEvents.triggerCompanySync(companyId, {
        campaignId: options.campaignId,
      });
      return {
        companyId,
        isSynced: false,
        syncedSources: 0,
        skippedSources: 0,
        failedSources: 0,
        mode: 'queued',
        jobId,
      };
    }

    let syncedSources = 0;
    let skippedSources = 0;
    let failedSources = 0;

    for (const source of status.sources) {
      if (source.state === 'synced') {
        skippedSources += 1;
        continue;
      }

      try {
        const expected = status.sources.find(
          (item) =>
            item.sourceType === source.sourceType &&
            item.sourceId === source.sourceId,
        );
        const payload = await this.findExpectedSource(
          companyId,
          source.sourceType,
          source.sourceId,
          options?.campaignId,
        );
        if (!payload) {
          failedSources += 1;
          continue;
        }

        await this.ingestionService.ingest({
          companyId,
          sourceType: source.sourceType,
          sourceId: source.sourceId,
          title: payload.title,
          content: payload.content,
          campaignId: payload.campaignId,
          forceReindex: true,
          metadata: payload.metadata,
        });
        syncedSources += 1;
        this.logger.log(
          `Synced ${source.sourceType}/${source.sourceId} for company ${companyId} (was ${source.state}, hash ${expected?.contentHash ?? 'n/a'})`,
        );
      } catch (error) {
        failedSources += 1;
        this.logger.error(
          `Failed to sync ${source.sourceType}/${source.sourceId} for company ${companyId}`,
          error,
        );
      }
    }

    return {
      companyId,
      isSynced: failedSources === 0,
      syncedSources,
      skippedSources,
      failedSources,
      mode: 'inline',
    };
  }

  async queueSync(
    companyId: string,
    options?: { campaignId?: string },
  ): Promise<string> {
    await this.assertCompanyExists(companyId);
    return this.ragEvents.triggerCompanySync(companyId, options);
  }

  private async assertCompanyExists(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!company) throw new NotFoundException('Company not found');
  }

  private async resolveSourceState(
    companyId: string,
    sourceType: RagSourceType,
    sourceId: string,
    content: string,
  ): Promise<RagSourceSyncState> {
    const expectedHash = hashRagContent(content);
    const document = await this.documentService.findBySource(
      companyId,
      sourceType,
      sourceId,
    );

    if (!document) return 'missing';
    if (document.status === 'INDEXING' || document.status === 'PENDING') {
      return 'indexing';
    }
    if (document.status === 'FAILED') return 'failed';

    const metadataHash = (document.metadata as { contentHash?: string } | null)
      ?.contentHash;
    const storedHash = metadataHash ?? document.contentHash;
    if (storedHash !== expectedHash) return 'stale';

    return document.status === 'INDEXED' ? 'synced' : 'stale';
  }

  private async collectExpectedSources(
    companyId: string,
    campaignId?: string,
  ): Promise<
    Array<{
      sourceType: RagSourceType;
      sourceId: string;
      title: string;
      content: string;
      campaignId?: string;
      metadata?: Record<string, unknown>;
    }>
  > {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        brandProfile: true,
        campaigns: campaignId
          ? { where: { id: campaignId } }
          : { where: { status: { not: 'ARCHIVED' } } },
        campaignFiles: campaignId
          ? { where: { campaignId } }
          : true,
      },
    });

    if (!company) throw new NotFoundException('Company not found');

    const sources: Array<{
      sourceType: RagSourceType;
      sourceId: string;
      title: string;
      content: string;
      campaignId?: string;
      metadata?: Record<string, unknown>;
    }> = [];

    if (company.brandProfile) {
      const content = serializeBrandProfile(company.brandProfile, company.name);
      if (content.trim()) {
        sources.push({
          sourceType: 'BRAND_BRAIN',
          sourceId: company.brandProfile.id,
          title: `Cérebro da Marca: ${company.name}`,
          content,
          metadata: { brandProfileId: company.brandProfile.id },
        });
      }
    }

    for (const campaign of company.campaigns) {
      sources.push({
        sourceType: 'CAMPAIGN',
        sourceId: campaign.id,
        title: `Campanha: ${campaign.name}`,
        content: serializeCampaign(campaign),
        campaignId: campaign.id,
      });
    }

    const campaignIds = new Set(company.campaigns.map((campaign) => campaign.id));
    const eligibleFiles = company.campaignFiles.filter((file) =>
      campaignIds.has(file.campaignId),
    );
    const enrichedFiles = await this.captionService.enrichCampaignFiles(eligibleFiles);

    for (const file of enrichedFiles) {
      const content = serializeCampaignFile(file);
      if (!content) continue;

      sources.push({
        sourceType: 'CAMPAIGN_FILE',
        sourceId: file.id,
        title: `Arquivo: ${file.name}`,
        content,
        campaignId: file.campaignId,
        metadata: {
          fileName: file.name,
          mimeType: file.mimeType,
          storageKey: file.storageKey,
        },
      });
    }

    return sources;
  }

  private async findExpectedSource(
    companyId: string,
    sourceType: RagSourceType,
    sourceId: string,
    campaignId?: string,
  ) {
    const sources = await this.collectExpectedSources(companyId, campaignId);
    return sources.find(
      (source) => source.sourceType === sourceType && source.sourceId === sourceId,
    );
  }
}
