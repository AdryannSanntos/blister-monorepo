import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  Sse,
  HttpCode,
  HttpStatus,
  MessageEvent,
} from '@nestjs/common';
import { Request } from 'express';
import {
  Observable,
  from,
  map,
  switchMap,
  takeUntil,
  Subject,
  finalize,
} from 'rxjs';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../auth/session.service';
import { CompanyService } from '../company/company.service';
import { WorkflowEngineService } from './runtime/workflow-engine.service';
import { AgentRunService } from './runtime/agent-run.service';
import { AgentRunReviewService } from './runtime/agent-run-review.service';
import { AgentSseService } from './runtime/agent-sse.service';
import {
  resumeAgentRequestSchema,
  approveAgentRunSchema,
  rejectAgentRunSchema,
  editAgentRunOutputSchema,
  regenerateAgentRunSchema,
} from '@company-os/types';

@Controller('agents/runs')
export class AgentRunsController {
  constructor(
    private readonly companyService: CompanyService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly runService: AgentRunService,
    private readonly reviewService: AgentRunReviewService,
    private readonly sseService: AgentSseService,
  ) {}

  @Get(':runId')
  @RequirePermission('generation.create')
  async getRunStatus(@Param('runId') runId: string) {
    return this.runService.findWithSteps(runId);
  }

  @Post(':runId/resume')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async resumeRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
  ) {
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
  async cancelRun(@Param('runId') runId: string) {
    const result = await this.workflowEngine.cancelRun(runId);
    return { runId: result.runId, status: result.status };
  }

  @Post(':runId/approve')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.OK)
  async approveRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const dto = approveAgentRunSchema.parse(body);

    return this.reviewService.approve(runId, user.id, dto);
  }

  @Post(':runId/reject')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.OK)
  async rejectRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const dto = rejectAgentRunSchema.parse(body);

    return this.reviewService.reject(runId, user.id, dto);
  }

  @Patch(':runId/output')
  @RequirePermission('generation.create')
  async editRunOutput(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const dto = editAgentRunOutputSchema.parse(body);

    return this.reviewService.editOutput(runId, user.id, dto);
  }

  @Post(':runId/regenerate')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerateRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const dto = regenerateAgentRunSchema.parse(body);

    return this.reviewService.regenerate(runId, user.id, dto);
  }

  @Sse(':runId/stream')
  @RequirePermission('generation.create')
  streamRun(
    @Param('runId') runId: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    const _user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const disconnect$ = new Subject<void>();

    req.on('close', () => {
      disconnect$.next();
      disconnect$.complete();
    });

    // NestJS @Sse requires an Observable. The previous implementation returned
    // a Promise<Observable> cast to Observable, which Nest never subscribed to —
    // so the stream never emitted anything. We resolve the run (for its
    // companyId / tenant scoping) inside the Observable via switchMap instead.
    let counter = 0;
    return from(this.runService.findByIdOrThrow(runId)).pipe(
      switchMap((run) => this.sseService.subscribe(runId, run.companyId)),
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
