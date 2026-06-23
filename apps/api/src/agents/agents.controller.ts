import { normalizeCutsModelTier, runAgentRequestSchema } from '@company-os/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { WorkspaceSettingsService } from '../workspace-settings/workspace-settings.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { AgentRunService, toRunScope } from './runtime/agent-run.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';

@Controller('agents')
export class AgentsController {
  constructor(
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workspaceSettings: WorkspaceSettingsService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly runService: AgentRunService,
  ) {}

  @Post(':agentId/run')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async runAgent(@Param('agentId') agentId: string, @Body() body: unknown, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const userId = user.id;
    const workspace = await this.workspaceContext.resolveFromRequest(userId, req);
    const dto = runAgentRequestSchema.parse(body);

    let metadata = dto.metadata;
    if (agentId === 'cuts') {
      const { config } = await this.workspaceSettings.getAgentSettings(userId, req, agentId);
      const requestMetadata = metadata as
        | {
            settings?: Record<string, unknown>;
            options?: Record<string, unknown>;
          }
        | undefined;
      const requestSettings = requestMetadata?.settings ?? {};
      const mergedSettings = {
        ...config,
        ...requestSettings,
        modelTier: normalizeCutsModelTier(
          (requestSettings.modelTier as 'auto' | 'basic' | 'pro' | undefined) ??
            config.modelTier,
        ),
      };
      metadata = {
        ...metadata,
        settings: mergedSettings,
        options: requestMetadata?.options,
      };
    }

    const result = await this.workflowEngine.startRun({
      agentId,
      companyId: workspace.type === 'company' ? workspace.companyId : undefined,
      personalSpaceId: workspace.type === 'personal' ? workspace.personalSpaceId : undefined,
      userId,
      userInput: dto.userInput,
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

    return this.runService.listByAgent(toRunScope(workspace), agentId, {
      limit: limit ? Number.parseInt(limit, 10) : 20,
      offset: offset ? Number.parseInt(offset, 10) : 0,
      reviewStatus: reviewStatus === 'pending' ? 'pending' : undefined,
    });
  }

  @Get(':agentId/stats')
  @RequirePermission('generation.create')
  async getAgentStats(@Param('agentId') agentId: string, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);

    return this.runService.getRunStats(toRunScope(workspace), agentId);
  }
}
