import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompanyService } from '../company/company.service';
import { CreditService } from './credits.service';
import { creditHistoryQuerySchema } from './dto/credits.dto';

@Controller('company/credits')
export class CreditsController {
  constructor(
    private readonly creditService: CreditService,
    private readonly companyService: CompanyService,
  ) {}

  @Get()
  @RequirePermission('credit.read')
  async getSummary(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.creditService.getSummary(company.id);
  }

  @Get('history')
  @RequirePermission('credit.read')
  async getHistory(@Req() req: Request, @Query() query: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = creditHistoryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return this.creditService.getHistory(
      company.id,
      parsed.data.page,
      parsed.data.pageSize,
    );
  }
}
