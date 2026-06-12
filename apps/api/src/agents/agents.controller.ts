import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { CompanyService } from '../company/company.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { WorkspaceSettingsService } from '../workspace-settings/workspace-settings.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';
import { AgentRunService } from './runtime/agent-run.service';
import { runAgentRequestSchema } from '@company-os/types';

const emptyRunStats = {
  totalRuns: 0,
  completed: 0,
  failed: 0,
  running: 0,
  avgCreditCost: 0,
};

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workspaceSettings: WorkspaceSettingsService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly runService: AgentRunService,
  ) {}

  @Post(':agentId/run')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async runAgent(
    @Param('agentId') agentId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const userId = user.id;
    const company = await this.companyService.findByOwnerOrThrow(userId, req);
    const dto = runAgentRequestSchema.parse(body);

    let metadata = dto.metadata;
    if (agentId === 'cuts') {
      const { config } = await this.workspaceSettings.getAgentSettings(userId, req, agentId);
      const requestSettings =
        (metadata as { settings?: Record<string, unknown> } | undefined)?.settings ?? {};
      metadata = {
        ...metadata,
        settings: { ...config, ...requestSettings },
      };
    }

    const result = await this.workflowEngine.startRun({
      agentId,
      companyId: company.id,
      userId,
      userInput: dto.userInput,
      campaignId: dto.campaignId,
      metadata,
    });

    return {
      runId: result.runId,
      status: result.status,
    };
  }

  @Get(':agentId/runs')
  @RequirePermission('generation.create')
  async listAgentRuns(
    @Param('agentId') agentId: string,
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('reviewStatus') reviewStatus?: string,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);

    if (workspace.type === 'personal') {
      return { runs: [], total: 0 };
    }

    return this.runService.listByAgent(workspace.companyId, agentId, {
      limit: limit ? Number.parseInt(limit, 10) : 20,
      offset: offset ? Number.parseInt(offset, 10) : 0,
      reviewStatus: reviewStatus === 'pending' ? 'pending' : undefined,
    });
  }

  @Get(':agentId/stats')
  @RequirePermission('generation.create')
  async getAgentStats(
    @Param('agentId') agentId: string,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);

    if (workspace.type === 'personal') {
      return emptyRunStats;
    }

    return this.runService.getRunStats(workspace.companyId, agentId);
  }
}
