import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { AgentContextService } from './agent-context.service';
import { AgentsService } from './agents.service';
import {
  agentContextFileSchema,
  agentContextReferenceSchema,
  createCompanyAgentSchema,
  saveDraftVersionSchema,
  updateCompanyAgentSchema,
} from './dto';

@Controller('organizations/:orgId/agents')
export class AgentsController {
  constructor(
    private readonly agentsService: AgentsService,
    private readonly agentContextService: AgentContextService,
  ) {}

  @Get()
  @RequirePermission('agent.read')
  async listCompanyAgents(@Param('orgId') orgId: string) {
    return this.agentsService.listCompanyAgents(orgId);
  }

  @Get(':agentId')
  @RequirePermission('agent.read')
  async getCompanyAgent(@Param('orgId') orgId: string, @Param('agentId') agentId: string) {
    return this.agentsService.getCompanyAgent(orgId, agentId);
  }

  @Post()
  @RequirePermission('agent.create')
  async createCompanyAgent(
    @Param('orgId') orgId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = createCompanyAgentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentsService.createCompanyAgent(orgId, currentUser.id, parsed.data);
  }

  @Patch(':agentId')
  @RequirePermission('agent.update')
  async updateCompanyAgent(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = updateCompanyAgentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    const orgContext = (req as unknown as Record<string, unknown>).orgContext as
      | { ability?: { can: (action: string, subject: string) => boolean } }
      | undefined;

    if (parsed.data.status === 'archived' && !orgContext?.ability?.can('delete', 'Agent')) {
      throw new ForbiddenException('You do not have permission to archive agents');
    }

    if (parsed.data.status === 'archived') {
      return this.agentsService.archiveAgent(orgId, agentId, currentUser.id);
    }

    return this.agentsService.updateCompanyAgent(orgId, agentId, currentUser.id, parsed.data);
  }

  @Post(':agentId/versions/draft')
  @RequirePermission('agent.update')
  async saveDraftVersion(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = saveDraftVersionSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentsService.saveDraftVersion(orgId, agentId, currentUser.id, parsed.data);
  }

  @Post(':agentId/versions/:versionId/publish')
  @RequirePermission('agent.publish')
  async publishVersion(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('versionId') versionId: string,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentsService.publishVersion(orgId, agentId, versionId, currentUser.id);
  }

  @Post(':agentId/versions/:versionId/activate')
  @RequirePermission('agent.publish')
  async activateVersion(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('versionId') versionId: string,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentsService.activateVersion(orgId, agentId, versionId, currentUser.id);
  }

  @Post(':agentId/reactivate')
  @RequirePermission('agent.delete')
  async reactivateAgent(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Req() req: Request,
  ) {
    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentsService.reactivateAgent(orgId, agentId, currentUser.id);
  }

  @Get(':agentId/context')
  @RequirePermission('agent.read')
  async getAgentContext(@Param('orgId') orgId: string, @Param('agentId') agentId: string) {
    return this.agentContextService.getAgentContext(orgId, agentId);
  }

  @Patch(':agentId/context')
  @RequirePermission('agent.update')
  async updateAgentContext(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const updateContextSchema = z.object({
      instructions: z.string().trim().optional(),
      notes: z.string().trim().optional(),
    });
    const parsed = updateContextSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.agentContextService.updateAgentContext(orgId, agentId, parsed.data);
  }

  @Get(':agentId/context/files')
  @RequirePermission('agent.read')
  async listContextFiles(@Param('orgId') orgId: string, @Param('agentId') agentId: string) {
    return this.agentContextService.listFiles(orgId, agentId);
  }

  @Post(':agentId/context/files')
  @RequirePermission('agent.update')
  async createContextFile(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const parsed = agentContextFileSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.agentContextService.createFile(orgId, agentId, parsed.data);
  }

  @Delete(':agentId/context/files/:fileId')
  @RequirePermission('agent.update')
  async archiveContextFile(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.agentContextService.archiveFile(orgId, agentId, fileId);
  }

  @Get(':agentId/context/references')
  @RequirePermission('agent.read')
  async listContextReferences(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.agentContextService.listReferences(orgId, agentId);
  }

  @Post(':agentId/context/references')
  @RequirePermission('agent.update')
  async createContextReference(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
  ) {
    const parsed = agentContextReferenceSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }
    return this.agentContextService.createReference(orgId, agentId, parsed.data);
  }

  @Delete(':agentId/context/references/:referenceId')
  @RequirePermission('agent.update')
  async removeContextReference(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Param('referenceId') referenceId: string,
  ) {
    return this.agentContextService.removeReference(orgId, agentId, referenceId);
  }
}
