import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, filter, map } from 'rxjs';
import type { AgentRunEvent, AgentRunEventType } from '@company-os/types';

interface InternalEvent {
  runId: string;
  companyId: string;
  event: AgentRunEvent;
}

@Injectable()
export class AgentSseService {
  private readonly logger = new Logger(AgentSseService.name);
  private readonly events$ = new Subject<InternalEvent>();

  emit(runId: string, companyId: string, type: AgentRunEventType, data?: Record<string, unknown>): void {
    const event: AgentRunEvent = {
      type,
      runId,
      timestamp: new Date().toISOString(),
      data,
    };

    this.events$.next({ runId, companyId, event });
    this.logger.debug(`Emitted ${type} for run ${runId}`);
  }

  subscribe(runId: string, companyId: string): Observable<AgentRunEvent> {
    return this.events$.pipe(
      filter((e) => e.runId === runId && e.companyId === companyId),
      map((e) => e.event),
    );
  }

  subscribeToCompany(companyId: string): Observable<AgentRunEvent> {
    return this.events$.pipe(
      filter((e) => e.companyId === companyId),
      map((e) => e.event),
    );
  }

  emitRunStarted(runId: string, companyId: string, agentId: string): void {
    this.emit(runId, companyId, 'run_started', { agentId });
  }

  emitStepStarted(runId: string, companyId: string, stepKey: string, stepIndex: number): void {
    this.emit(runId, companyId, 'step_started', { stepKey, stepIndex });
  }

  emitStepCompleted(runId: string, companyId: string, stepKey: string, output: Record<string, unknown>): void {
    this.emit(runId, companyId, 'step_completed', { stepKey, output });
  }

  emitStepFailed(runId: string, companyId: string, stepKey: string, error: string): void {
    this.emit(runId, companyId, 'step_failed', { stepKey, error });
  }

  emitRunPaused(runId: string, companyId: string, reason: string, formSchema?: unknown): void {
    this.emit(runId, companyId, 'run_paused', { reason, formSchema });
  }

  emitRunCompleted(runId: string, companyId: string, output: Record<string, unknown>): void {
    this.emit(runId, companyId, 'run_completed', { output });
  }

  emitRunFailed(runId: string, companyId: string, error: string): void {
    this.emit(runId, companyId, 'run_failed', { error });
  }

  emitOutputChunk(runId: string, companyId: string, chunk: string): void {
    this.emit(runId, companyId, 'output_chunk', { chunk });
  }
}
