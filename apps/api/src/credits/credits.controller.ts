import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { RequirePlatformRole } from '../platform/decorators/require-platform-role.decorator';
import { PlatformRoleGuard } from '../platform/guards/platform-role.guard';
import { CreditsService } from './credits.service';
import { z } from 'zod';

@Controller('organizations/:orgId/credits')
export class OrganizationCreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  @RequirePermission('credit.read')
  async getBalance(@Param('orgId') orgId: string) {
    return this.creditsService.getOrganizationBalance(orgId);
  }

  @Get('ledger')
  @RequirePermission('credit.read')
  async getLedger(@Param('orgId') orgId: string) {
    return this.creditsService.listOrganizationLedger(orgId);
  }
}

@Controller('platform/costs')
@UseGuards(PlatformRoleGuard)
@RequirePlatformRole('platform_admin')
export class PlatformCostsController {
  constructor(private readonly creditsService: CreditsService) {}

  private parseFilters(query: unknown) {
    const schema = z.object({
      providerId: z.string().min(1).optional(),
      modelId: z.string().min(1).optional(),
      organizationId: z.string().min(1).optional(),
      dateFrom: z.string().min(1).optional(),
      dateTo: z.string().min(1).optional(),
      minCost: z.coerce.number().optional(),
      maxCost: z.coerce.number().optional(),
    });
    const parsed = schema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return parsed.data;
  }

  @Get()
  async getSummary(@Query() query: unknown) {
    return this.creditsService.getPlatformCostSummary(this.parseFilters(query));
  }

  @Get('providers')
  async getProviderBreakdown(@Query() query: unknown) {
    return this.creditsService.getPlatformCostSummary({
      ...this.parseFilters(query),
      groupBy: 'provider',
    });
  }

  @Get('models')
  async getModelBreakdown(@Query() query: unknown) {
    return this.creditsService.getPlatformCostSummary({
      ...this.parseFilters(query),
      groupBy: 'model',
    });
  }
}
