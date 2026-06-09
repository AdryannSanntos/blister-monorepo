import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CompanyService } from './company.service';
import {
  deleteCompanySchema,
  updateCompanyBodySchema,
  onboardingBodySchema,
} from './dto/company.dto';

@Controller('company')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @RequirePermission('company.read')
  async getCompany(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.companyService.findByOwnerOrThrow(user.id, req);
  }

  @Patch()
  @RequirePermission('company.update')
  async updateCompany(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateCompanyBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companyService.updateName(user.id, parsed.data, req);
  }

  @Get('onboarding-status')
  @RequirePermission('company.read')
  async getOnboardingStatus(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    return this.companyService.getOnboardingStatus(user.id);
  }

  @Post('onboarding')
  @RequirePermission('company.update')
  async completeOnboarding(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = onboardingBodySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companyService.completeOnboarding(user.id, parsed.data);
  }

  @Delete()
  @RequirePermission('company.delete')
  async deleteCompany(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = deleteCompanySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companyService.deleteCompany(
      user.id,
      parsed.data.confirmName,
      req,
    );
  }
}

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  @RequirePermission('company.read')
  async listCompanies(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const companies = await this.companyService.listByOwner(user.id);
    return companies.map((company) => ({
      ...company,
      onboardingCompletedAt: company.onboardingCompletedAt?.toISOString() ?? null,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    }));
  }

  @Get('home-destination')
  @RequirePermission('company.read')
  async getHomeDestination(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const destination = await this.companyService.getHomeDestination(user.id);
    const companies = await this.companyService.listByOwner(user.id);
    const onboardedCompanies = companies.filter(
      (company) => company.onboardingCompletedAt,
    );

    return {
      destination,
      companyCount: companies.length,
      onboardedCount: onboardedCompanies.length,
    };
  }
}
