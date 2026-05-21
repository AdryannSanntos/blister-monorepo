import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { RequirePlatformRole } from '../platform/decorators/require-platform-role.decorator';
import { PlatformRoleGuard } from '../platform/guards/platform-role.guard';
import { AgentRunsService } from './agent-runs.service';
import { executeAgentSchema, getAgentRunSchema, listAgentRunsSchema } from './dto';
import { z } from 'zod';

@Controller('organizations/:orgId/agents')
export class AgentRunsController {
  constructor(private readonly agentRunsService: AgentRunsService) {}

  @Post(':agentId/runs')
  @RequirePermission('agent.execute')
  async createRun(
    @Param('orgId') orgId: string,
    @Param('agentId') agentId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const parsed = executeAgentSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentRunsService.createQueuedRun(orgId, agentId, currentUser.id, parsed.data);
  }

  @Get('runs')
  @RequirePermission('agent.run.read')
  async listRuns(@Param('orgId') orgId: string, @Query() query: unknown, @Req() req: Request) {
    const parsed = listAgentRunsSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentRunsService.listRuns(orgId, parsed.data, currentUser.id);
  }

  @Get('runs/:runId')
  @RequirePermission('agent.run.read')
  async getRun(
    @Param('orgId') orgId: string,
    @Param('runId') runId: string,
    @Query() query: unknown,
    @Req() req: Request,
  ) {
    const parsed = getAgentRunSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    const currentUser = (req as unknown as Record<string, unknown>).currentUser as CurrentUser;
    return this.agentRunsService.getRun(orgId, runId, currentUser.id, parsed.data.onlyOwnRuns);
  }
}

const listPlatformRunsSchema = z.object({
  providerId: z.string().min(1).optional(),
  modelId: z.string().min(1).optional(),
  organizationId: z.string().min(1).optional(),
  agentTemplateId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  dateFrom: z.string().min(1).optional(),
  dateTo: z.string().min(1).optional(),
  minCost: z.coerce.number().optional(),
  maxCost: z.coerce.number().optional(),
});

@Controller('platform/agents/runs')
@UseGuards(PlatformRoleGuard)
@RequirePlatformRole('platform_admin')
export class PlatformAgentRunsController {
  constructor(private readonly agentRunsService: AgentRunsService) {}

  @Get()
  async listRuns(@Query() query: unknown) {
    const parsed = listPlatformRunsSchema.safeParse(query);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues);
    }

    return this.agentRunsService.listPlatformRuns(parsed.data);
  }

  @Get(':runId')
  async getRun(@Param('runId') runId: string) {
    return this.agentRunsService.getPlatformRun(runId);
  }
}
