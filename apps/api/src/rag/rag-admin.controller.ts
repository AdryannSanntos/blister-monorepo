import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { DocumentService } from './document.service';
import { IngestionService } from './ingestion.service';
import { RetrievalService } from './retrieval.service';
import { ContextPackService } from './context-pack.service';
import { CompanyRagSyncService } from './company-rag-sync.service';
import type { RagSourceType } from '@company-os/types';
import { z } from 'zod';

const searchQuerySchema = z.object({
  query: z.string().min(1).max(4000),
  limit: z.coerce.number().int().min(1).max(50).default(8),
  sourceTypes: z.string().optional(),
  campaignId: z.string().optional(),
  agentId: z.string().optional(),
});

const buildContextPackSchema = z.object({
  query: z.string().min(1).max(4000),
  agentId: z.string().optional(),
  campaignId: z.string().optional(),
  limit: z.number().int().min(1).max(50).default(8),
  includeBrandBrain: z.boolean().default(true),
  includeAgentLearning: z.boolean().default(true),
  includeCampaignContext: z.boolean().default(true),
});

@Controller('admin/rag')
export class RagAdminController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly ingestionService: IngestionService,
    private readonly retrievalService: RetrievalService,
    private readonly contextPackService: ContextPackService,
  ) {}

  @Get('companies/:companyId/documents')
  @RequirePermission('company.read')
  async listDocuments(
    @Param('companyId') companyId: string,
    @Query('sourceType') sourceType?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const result = await this.documentService.listByCompany(companyId, {
      sourceType: sourceType as RagSourceType | undefined,
      status: status as 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED' | undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return result;
  }

  @Get('companies/:companyId/stats')
  @RequirePermission('company.read')
  async getStats(@Param('companyId') companyId: string) {
    return this.documentService.getStats(companyId);
  }

  @Get('documents/:documentId')
  @RequirePermission('company.read')
  async getDocument(@Param('documentId') documentId: string) {
    return this.documentService.findWithChunks(documentId);
  }

  @Delete('documents/:documentId')
  @RequirePermission('company.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(@Param('documentId') documentId: string) {
    const doc = await this.documentService.findByIdOrThrow(documentId);
    await this.documentService.deleteBySource(
      doc.companyId,
      doc.sourceType as RagSourceType,
      doc.sourceId,
    );
  }

  @Post('companies/:companyId/search')
  @RequirePermission('company.read')
  async search(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = searchQuerySchema.parse(body);
    const sourceTypes = parsed.sourceTypes
      ? (parsed.sourceTypes.split(',') as RagSourceType[])
      : undefined;

    return this.retrievalService.search({
      companyId,
      query: parsed.query,
      limit: parsed.limit,
      sourceTypes,
      campaignId: parsed.campaignId,
      agentId: parsed.agentId,
    });
  }

  @Post('companies/:companyId/context-pack')
  @RequirePermission('company.read')
  async buildContextPack(
    @Param('companyId') companyId: string,
    @Body() body: unknown,
  ) {
    const parsed = buildContextPackSchema.parse(body);

    const pack = await this.contextPackService.buildPack({
      companyId,
      query: parsed.query,
      agentId: parsed.agentId,
      campaignId: parsed.campaignId,
      limit: parsed.limit,
      includeBrandBrain: parsed.includeBrandBrain,
      includeAgentLearning: parsed.includeAgentLearning,
      includeCampaignContext: parsed.includeCampaignContext,
    });

    return {
      ...pack,
      formattedContext: this.contextPackService.formatContextForPrompt(pack),
    };
  }

  @Post('companies/:companyId/reindex')
  @RequirePermission('company.update')
  async reindexCompany(@Param('companyId') companyId: string) {
    const jobId = await this.ingestionService.createIndexJob(companyId);
    return { jobId, status: 'queued' };
  }

  @Post('documents/:documentId/reindex')
  @RequirePermission('company.update')
  async reindexDocument(@Param('documentId') documentId: string) {
    const doc = await this.documentService.findByIdOrThrow(documentId);
    const jobId = await this.ingestionService.createIndexJob(doc.companyId, documentId);
    return { jobId, status: 'queued' };
  }
}
