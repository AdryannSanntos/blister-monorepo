import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable, concat, defer, filter, from, map } from 'rxjs';
import type { AgentRunEvent, AgentRunEventType } from '@company-os/types';

interface InternalEvent {
  runId: string;
  companyId: string;
  event: AgentRunEvent;
}

const TERMINAL_EVENTS: AgentRunEventType[] = ['run_completed', 'run_failed', 'run_cancelled'];
const MAX_BUFFER_PER_RUN = 500;
const BUFFER_TTL_MS = 5 * 60 * 1000;

/**
 * In-process pub/sub bridge for agent run events.
 *
 * A short-lived per-run buffer is kept so that a subscriber connecting slightly
 * after execution started (the inline-execution race, or a reconnect) still
 * receives the events it missed. Without this, events emitted between
 * triggering a run and the browser opening the EventSource were lost — a key
 * reason the stream appeared to "return nothing".
 */
@Injectable()
export class AgentSseService {
  private readonly logger = new Logger(AgentSseService.name);
  private readonly events$ = new Subject<InternalEvent>();
  private readonly buffers = new Map<string, AgentRunEvent[]>();
  private readonly cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

  emit(
    runId: string,
    companyId: string,
    type: AgentRunEventType,
    data?: Record<string, unknown>,
  ): void {
    const event: AgentRunEvent = {
      type,
      runId,
      timestamp: new Date().toISOString(),
      data,
    };

    const buffer = this.buffers.get(runId) ?? [];
    buffer.push(event);
    if (buffer.length > MAX_BUFFER_PER_RUN) buffer.shift();
    this.buffers.set(runId, buffer);

    this.events$.next({ runId, companyId, event });
    this.logger.debug(`Emitted ${type} for run ${runId}`);

    if (TERMINAL_EVENTS.includes(type)) {
      this.scheduleCleanup(runId);
    }
  }

  private scheduleCleanup(runId: string): void {
    const existing = this.cleanupTimers.get(runId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.buffers.delete(runId);
      this.cleanupTimers.delete(runId);
    }, BUFFER_TTL_MS);

    // Don't keep the process alive just for buffer cleanup.
    if (typeof timer.unref === 'function') timer.unref();
    this.cleanupTimers.set(runId, timer);
  }

  subscribe(runId: string, companyId: string): Observable<AgentRunEvent> {
    const live$ = this.events$.pipe(
      filter((e) => e.runId === runId && e.companyId === companyId),
      map((e) => e.event),
    );

    // Replay buffered events first (snapshot at subscribe time), then live ones.
    return defer(() => {
      const buffered = this.buffers.get(runId) ?? [];
      return concat(from([...buffered]), live$);
    });
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

  emitRunPaused(
    runId: string,
    companyId: string,
    reason: string,
    formSchema?: unknown,
    inputPayload?: Record<string, unknown>,
  ): void {
    this.emit(runId, companyId, 'run_paused', {
      reason,
      pauseReason: reason,
      formSchema,
      pauseFormSchema: formSchema,
      inputPayload,
    });
  }

  emitRunCompleted(
    runId: string,
    companyId: string,
    output: Record<string, unknown>,
    totalCreditCost?: number,
  ): void {
    this.emit(runId, companyId, 'run_completed', {
      output,
      outputPayload: output,
      totalCreditCost,
    });
  }

  emitRunFailed(runId: string, companyId: string, error: string): void {
    this.emit(runId, companyId, 'run_failed', { error });
  }

  emitRunCancelled(runId: string, companyId: string, agentId: string): void {
    this.emit(runId, companyId, 'run_cancelled', { agentId });
  }

  emitOutputChunk(runId: string, companyId: string, chunk: string): void {
    this.emit(runId, companyId, 'output_chunk', { chunk });
  }
}
