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
import { WorkflowEngineService } from './runtime/workflow-engine.service';
import { AgentRunService } from './runtime/agent-run.service';
import { runAgentRequestSchema } from '@company-os/types';

@Controller('api/agents')
export class AgentsController {
  constructor(
    private readonly companyService: CompanyService,
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

    const result = await this.workflowEngine.startRun({
      agentId,
      companyId: company.id,
      userId,
      userInput: dto.userInput,
      campaignId: dto.campaignId,
      metadata: dto.metadata,
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
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Req() req?: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const userId = user.id;
    const company = await this.companyService.findByOwnerOrThrow(userId, req);

    return this.runService.listByAgent(company.id, agentId, {
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Get(':agentId/stats')
  @RequirePermission('generation.create')
  async getAgentStats(
    @Param('agentId') agentId: string,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const userId = user.id;
    const company = await this.companyService.findByOwnerOrThrow(userId, req);

    return this.runService.getRunStats(company.id, agentId);
  }
}
