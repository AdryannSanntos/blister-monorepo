import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { CompanyRagSyncService } from '../rag/company-rag-sync.service';
import { CompanyService } from './company.service';

@Controller('company/rag')
export class RagCompanyController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly companyRagSync: CompanyRagSyncService,
  ) {}

  @Get('status')
  @RequirePermission('company.read')
  async getSyncStatus(
    @Req() req: Request,
    @Query('campaignId') campaignId?: string,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.companyRagSync.getSyncStatus(company.id, campaignId);
  }

  @Post('sync')
  @RequirePermission('company.update')
  @HttpCode(HttpStatus.ACCEPTED)
  async syncCompany(
    @Req() req: Request,
    @Query('campaignId') campaignId?: string,
    @Query('mode') mode?: string,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);

    if (mode === 'inline') {
      return this.companyRagSync.ensureSynced(company.id, { campaignId });
    }

    const jobId = await this.companyRagSync.queueSync(company.id, { campaignId });
    return { companyId: company.id, jobId, status: 'queued' };
  }
}
