import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { ingestDocumentSchema, ragRetrievalQuerySchema, reindexScopeSchema } from '@company-os/types';
import { RagDocumentService } from './rag-document.service';
import { RagIndexingService } from './rag-indexing.service';
import { RagRetrievalService } from './rag-retrieval.service';

const listDocumentsQuerySchema = z.object({
  sourceType: z.string().optional(),
  status: z.string().optional(),
});

@Controller('organizations/:orgId/rag')
export class RagController {
  constructor(
    private readonly ragIndexingService: RagIndexingService,
    private readonly ragDocumentService: RagDocumentService,
    private readonly ragRetrievalService: RagRetrievalService,
  ) {}

  @Post('ingest')
  @RequirePermission('context.create')
  async ingest(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = ingestDocumentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    return this.ragIndexingService.ingest(orgId, parsed.data, currentUser.id);
  }

  @Post('reindex')
  @RequirePermission('context.update')
  async reindexScope(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = reindexScopeSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;

    return this.ragIndexingService.reindexScope(orgId, parsed.data, currentUser.id);
  }

  @Post('search')
  @RequirePermission('context.read')
  async search(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = ragRetrievalQuerySchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const orgContext = (req as unknown as Record<string, unknown>).orgContext as
      | { permissions?: string[] }
      | undefined;
    const permissions = orgContext?.permissions ?? [];

    return this.ragRetrievalService.search(orgId, parsed.data.query, {
      limit: parsed.data.limit,
      minScore: parsed.data.minScore,
      sourceTypes: parsed.data.sourceTypes as string[] | undefined,
      permissions,
    });
  }

  @Get('documents')
  @RequirePermission('context.read')
  async listDocuments(
    @Param('orgId') orgId: string,
    @Query() query: unknown,
  ) {
    const parsed = listDocumentsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.ragDocumentService.listDocuments(orgId, parsed.data);
  }

  @Get('documents/:documentId')
  @RequirePermission('context.read')
  async getDocument(
    @Param('orgId') orgId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.ragDocumentService.getDocument(orgId, documentId);
  }
}
