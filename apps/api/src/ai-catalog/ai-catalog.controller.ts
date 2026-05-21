import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePlatformRole } from '../platform/decorators/require-platform-role.decorator';
import { PlatformRoleGuard } from '../platform/guards/platform-role.guard';
import {
  createCredentialSchema,
  createModelSchema,
  createProviderSchema,
  listModelsSchema,
  listPoliciesSchema,
  updateCredentialSchema,
  updateModelSchema,
  updateProviderSchema,
  upsertPolicySchema,
} from './dto';
import { AICatalogService } from './ai-catalog.service';

function parseBody<T>(
  schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false; error: unknown } },
  value: unknown,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error);
  }

  return parsed.data;
}

@Controller('platform/ai')
@UseGuards(PlatformRoleGuard)
@RequirePlatformRole('platform_admin')
export class AICatalogController {
  constructor(private readonly aiCatalogService: AICatalogService) {}

  @Get('providers')
  async listProviders() {
    return this.aiCatalogService.listProviders();
  }

  @Post('providers')
  async createProvider(@Body() body: unknown) {
    return this.aiCatalogService.createProvider(parseBody(createProviderSchema, body));
  }

  @Patch('providers/:providerId')
  async updateProvider(@Param('providerId') providerId: string, @Body() body: unknown) {
    return this.aiCatalogService.updateProvider(providerId, parseBody(updateProviderSchema, body));
  }

  @Get('models')
  async listModels(@Query() query: unknown) {
    return this.aiCatalogService.listModels(parseBody(listModelsSchema, query));
  }

  @Post('models')
  async createModel(@Body() body: unknown) {
    return this.aiCatalogService.createModel(parseBody(createModelSchema, body));
  }

  @Patch('models/:modelId')
  async updateModel(@Param('modelId') modelId: string, @Body() body: unknown) {
    return this.aiCatalogService.updateModel(modelId, parseBody(updateModelSchema, body));
  }

  @Post('credentials')
  async createCredential(@Body() body: unknown, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.aiCatalogService.createCredential(
      currentUser.id,
      parseBody(createCredentialSchema, body),
    );
  }

  @Patch('credentials/:credentialId')
  async updateCredential(
    @Param('credentialId') credentialId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.aiCatalogService.updateCredential(
      currentUser.id,
      credentialId,
      parseBody(updateCredentialSchema, body),
    );
  }

  @Get('policies')
  async listPolicies(@Query() query: unknown) {
    return this.aiCatalogService.listPolicies(parseBody(listPoliciesSchema, query));
  }

  @Put('policies')
  async upsertPolicy(@Body() body: unknown, @Req() req: Request) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.aiCatalogService.upsertPolicy(currentUser.id, parseBody(upsertPolicySchema, body));
  }
}
