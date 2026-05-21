import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { AgentsService } from './agents.service';
import {
  createCompanyAgentSchema,
  saveDraftVersionSchema,
  updateCompanyAgentSchema,
} from './dto';

@Controller('organizations/:orgId/agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

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
}
