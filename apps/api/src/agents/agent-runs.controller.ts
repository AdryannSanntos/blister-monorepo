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

  private async resolveCompanyId(req: Request): Promise<string> {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const company = await this.companyService.findByOwnerOrThrow(user.id, req);
    return company.id;
  }

  @Get(':runId')
  @RequirePermission('generation.create')
  async getRunStatus(@Param('runId') runId: string, @Req() req: Request) {
    const companyId = await this.resolveCompanyId(req);
    return this.runService.findWithSteps(runId, companyId);
  }

  @Post(':runId/resume')
  @RequirePermission('generation.create')
  @HttpCode(HttpStatus.ACCEPTED)
  async resumeRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
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
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
    const result = await this.workflowEngine.cancelRun(runId, companyId);
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
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
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
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
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
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
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
    const companyId = await this.resolveCompanyId(req);
    await this.runService.assertRunBelongsToCompany(runId, companyId);
    const dto = regenerateAgentRunSchema.parse(body);

    return this.reviewService.regenerate(runId, user.id, dto);
  }

  @Sse(':runId/stream')
  @RequirePermission('generation.create')
  streamRun(
    @Param('runId') runId: string,
    @Req() req: Request,
  ): Observable<MessageEvent> {
    const disconnect$ = new Subject<void>();

    req.on('close', () => {
      disconnect$.next();
      disconnect$.complete();
    });

    let counter = 0;
    return from(this.resolveCompanyId(req)).pipe(
      switchMap((companyId) =>
        from(this.runService.findByIdOrThrow(runId, companyId)).pipe(
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
