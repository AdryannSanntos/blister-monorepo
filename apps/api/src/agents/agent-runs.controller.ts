import {
  approveAgentRunSchema,
  editAgentRunOutputSchema,
  regenerateAgentRunSchema,
  rejectAgentRunSchema,
  resumeAgentRequestSchema,
} from '@company-os/types';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  MessageEvent,
  Param,
  Patch,
  Post,
  Req,
  Sse,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, Subject, finalize, from, map, switchMap, takeUntil } from 'rxjs';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { WorkspaceContextService } from '../workspace/workspace-context.service';
import { AgentRunReviewService } from './runtime/agent-run-review.service';
import { AgentRunService, type RunWorkspaceScope, toRunScope } from './runtime/agent-run.service';
import { AgentSseService } from './runtime/agent-sse.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';

@Controller('agents/runs')
export class AgentRunsController {
  constructor(
    private readonly workspaceContext: WorkspaceContextService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly runService: AgentRunService,
    private readonly reviewService: AgentRunReviewService,
    private readonly sseService: AgentSseService,
  ) {}

  private async resolveScope(req: Request): Promise<RunWorkspaceScope> {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    return toRunScope(workspace);
  }

  @Get(':runId')
  @RequirePermission('generation.create')
  async getRunStatus(@Param('runId') runId: string, @Req() req: Request) {
    const scope = await this.resolveScope(req);
    return this.runService.findWithSteps(runId, scope);
  }

  @Post(':runId/resume')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async resumeRun(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const dto = resumeAgentRequestSchema.parse(body);

    const result = await this.workflowEngine.resumeRun({
      runId,
      formData: dto.formData,
    });

    return {
      runId: result.runId,
      status: result.status,
    };
  }

  @Post(':runId/cancel')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.OK)
  async cancelRun(@Param('runId') runId: string, @Req() req: Request) {
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const result = await this.workflowEngine.cancelRun(runId, scope);
    return { runId: result.runId, status: result.status };
  }

  @Post(':runId/approve')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.OK)
  async approveRun(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const dto = approveAgentRunSchema.parse(body);

    return this.reviewService.approve(runId, user.id, dto);
  }

  @Post(':runId/reject')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.OK)
  async rejectRun(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const dto = rejectAgentRunSchema.parse(body);

    return this.reviewService.reject(runId, user.id, dto);
  }

  @Patch(':runId/output')
  @RequirePermission('generation.create')
  async editRunOutput(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const dto = editAgentRunOutputSchema.parse(body);

    return this.reviewService.editOutput(runId, user.id, dto);
  }

  @Post(':runId/regenerate')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerateRun(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const scope = await this.resolveScope(req);
    await this.runService.assertRunBelongsToWorkspace(runId, scope);
    const dto = regenerateAgentRunSchema.parse(body);

    return this.reviewService.regenerate(runId, user.id, dto);
  }

  @Sse(':runId/stream')
  @RequirePermission('generation.create')
  streamRun(@Param('runId') runId: string, @Req() req: Request): Observable<MessageEvent> {
    const disconnect$ = new Subject<void>();

    req.on('close', () => {
      disconnect$.next();
      disconnect$.complete();
    });

    let counter = 0;
    return from(this.resolveScope(req)).pipe(
      switchMap((scope) =>
        from(this.runService.findByIdOrThrow(runId, scope)).pipe(
          switchMap((run) => this.sseService.subscribe(runId, run.companyId)),
        ),
      ),
      takeUntil(disconnect$),
      map((event) => ({
        data: JSON.stringify(event),
        type: event.type,
        id: `${runId}-${counter++}`,
      })),
      finalize(() => disconnect$.complete()),
    );
  }
}
