import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '../auth/session.service';
import { RequirePlatformRole } from '../platform/decorators/require-platform-role.decorator';
import { PlatformRoleGuard } from '../platform/guards/platform-role.guard';
import {
  addCredentialSchema,
  adjustCompanyCreditSchema,
  createModelSchema,
  createProviderSchema,
  platformCompaniesQuerySchema,
  updateAgentPolicySchema,
  updateAgentStepPoliciesBatchSchema,
  updateAgentStepPolicySchema,
  updateCreditSettingsSchema,
  updateModelSchema,
  updatePipelineSchema,
  updateProviderSchema,
  updateRagSettingsSchema,
} from './dto/ai-catalog.dto';
import { ModelsService } from './models.service';
import { PlatformAgentsService } from './platform-agents.service';
import { PlatformCompaniesService } from './platform-companies.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PoliciesService } from './policies.service';
import { ProvidersService } from './providers.service';

@Controller('platform')
@UseGuards(PlatformRoleGuard)
@RequirePlatformRole('platform_admin')
export class AiCatalogController {
  constructor(
    private readonly providers: ProvidersService,
    private readonly models: ModelsService,
    private readonly policies: PoliciesService,
    private readonly platformAgents: PlatformAgentsService,
    private readonly settings: PlatformSettingsService,
    private readonly companies: PlatformCompaniesService,
  ) {}

  // ── Providers ──────────────────────────────────────────────────────────────
  @Get('ai/providers')
  listProviders() {
    return this.providers.findAll();
  }

  @Post('ai/providers')
  createProvider(@Body() body: unknown) {
    const parsed = createProviderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.create(parsed.data);
  }

  @Patch('ai/providers/:id')
  updateProvider(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateProviderSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.update(id, parsed.data);
  }

  @Post('ai/providers/:id/credentials')
  addCredential(@Param('id') providerId: string, @Body() body: unknown) {
    const parsed = addCredentialSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.providers.addCredential(providerId, parsed.data);
  }

  @Delete('ai/providers/:id/credentials/:credId')
  deleteCredential(@Param('credId') credId: string) {
    return this.providers.deleteCredential(credId);
  }

  // ── Models ─────────────────────────────────────────────────────────────────
  @Get('ai/models')
  listModels() {
    return this.models.findAll();
  }

  @Post('ai/models')
  createModel(@Body() body: unknown) {
    const parsed = createModelSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.models.create(parsed.data);
  }

  @Patch('ai/models/:id')
  updateModel(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateModelSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.models.update(id, parsed.data);
  }

  @Delete('ai/models/:id')
  deleteModel(@Param('id') id: string) {
    return this.models.delete(id);
  }

  // ── Agents (platform admin) ────────────────────────────────────────────────
  @Get('agents/overview')
  listAgentsOverview() {
    return this.platformAgents.getAdminOverview();
  }

  // ── Policies ───────────────────────────────────────────────────────────────
  @Get('agents/policies')
  listPolicies() {
    return this.policies.findAllPolicies();
  }

  @Patch('agents/policies/:agentId')
  updatePolicy(@Param('agentId') agentId: string, @Body() body: unknown) {
    const parsed = updateAgentPolicySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updatePolicy(agentId, parsed.data);
  }

  @Patch('agents/policies/:agentId/steps/:stepKey')
  updateStepPolicy(
    @Param('agentId') agentId: string,
    @Param('stepKey') stepKey: string,
    @Body() body: unknown,
  ) {
    const parsed = updateAgentStepPolicySchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updateStepPolicy(agentId, stepKey, parsed.data);
  }

  @Patch('agents/policies/:agentId/steps')
  updateStepPoliciesBatch(
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const parsed = updateAgentStepPoliciesBatchSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updateStepPoliciesBatch(agentId, parsed.data);
  }

  @Delete('agents/policies/:agentId/steps/:stepKey')
  deleteStepPolicy(
    @Param('agentId') agentId: string,
    @Param('stepKey') stepKey: string,
  ) {
    return this.policies.deleteStepPolicy(agentId, stepKey);
  }

  // ── Pipeline ───────────────────────────────────────────────────────────────
  @Get('agents/pipeline')
  getPipeline() {
    return this.policies.getPipeline();
  }

  @Patch('agents/pipeline')
  updatePipeline(@Body() body: unknown) {
    const parsed = updatePipelineSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.policies.updatePipeline(parsed.data);
  }

  // ── Platform settings ──────────────────────────────────────────────────────
  @Get('settings')
  getSettings() {
    return this.settings.getSettings();
  }

  @Patch('settings/credits')
  @RequirePlatformRole('platform_owner')
  updateCreditSettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateCreditSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.settings.updateCreditSettings(user.id, parsed.data);
  }

  @Patch('settings/rag')
  updateRagSettings(@Req() req: Request, @Body() body: unknown) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = updateRagSettingsSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.settings.updateRagSettings(user.id, parsed.data);
  }

  // ── Companies ──────────────────────────────────────────────────────────────
  @Get('companies')
  listCompanies(@Query() query: unknown) {
    const parsed = platformCompaniesQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companies.findAll(parsed.data);
  }

  @Get('companies/:id')
  getCompany(@Param('id') id: string) {
    return this.companies.findById(id);
  }

  @Post('companies/:id/credits/adjust')
  @RequirePlatformRole('platform_owner')
  adjustCredits(
    @Req() req: Request,
    @Param('id') companyId: string,
    @Body() body: unknown,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const parsed = adjustCompanyCreditSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.issues);
    return this.companies.adjustCredits(companyId, user.id, parsed.data);
  }
}
