import { Logger } from '@nestjs/common';
import type {
  EventPublisher,
  RunEventPayload,
  RunSnapshot,
  TelemetryProvider,
} from '@company-os/agent-ia-sdk/agents';

export const isDevEnvironment = (): boolean => process.env.NODE_ENV === 'development';

/** Verbose agent pipeline logs (steps, events, LLM usage). Off by default in dev. */
export const isVerboseAgentDevLogging = (): boolean =>
  isDevEnvironment() &&
  (process.env.AGENT_DEV_LOGGING === 'true' || process.env.AGENT_DEV_LOGGING === '1');

class DevAgentLogger {
  private readonly logger = new Logger('AgentDev');

  log(message: string, context?: Record<string, unknown>): void {
    if (!isVerboseAgentDevLogging()) return;
    if (context) {
      this.logger.log(`${message} ${JSON.stringify(context)}`);
      return;
    }
    this.logger.log(message);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (!isDevEnvironment()) return;
    if (context) {
      this.logger.warn(`${message} ${JSON.stringify(context)}`);
      return;
    }
    this.logger.warn(message);
  }

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (!isDevEnvironment()) return;

    const errorDetail =
      error instanceof Error ? { message: error.message, stack: error.stack } : error;

    const payload =
      errorDetail !== undefined
        ? { ...(context ?? {}), error: errorDetail }
        : (context ?? {});

    this.logger.error(
      Object.keys(payload).length > 0
        ? `${message} ${JSON.stringify(payload)}`
        : message,
      error instanceof Error ? error.stack : undefined,
    );
  }
}

export const devAgentLogger = new DevAgentLogger();

const summarizeEventData = (event: RunEventPayload): Record<string, unknown> => {
  const data = event.data ?? {};

  if ('output' in data && data.output && typeof data.output === 'object') {
    const keys = Object.keys(data.output as object);
    return {
      ...data,
      output: `[${keys.length} keys: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}]`,
    };
  }

  if ('chunk' in data && typeof data.chunk === 'string' && data.chunk.length > 100) {
    return { chunk: `${data.chunk.slice(0, 100)}...` };
  }

  return data;
};

export const createDevTelemetryProvider = (): TelemetryProvider => ({
  onRunStarted: (event) => {
    devAgentLogger.log('Run started', {
      runId: event.runId,
      agentId: event.agentId,
      companyId: event.companyId,
    });
  },

  onStepCompleted: (event) => {
    const payload = {
      runId: event.runId,
      agentId: event.agentId,
      stepKey: event.stepKey,
      status: event.status,
      tokensInput: event.tokensInput,
      tokensOutput: event.tokensOutput,
      creditCost: event.creditCost,
    };

    if (event.status === 'FAILED') {
      devAgentLogger.error('Step failed', undefined, payload);
      return;
    }

    if (event.status === 'PAUSED') {
      devAgentLogger.warn('Step paused (awaiting input or renders)', payload);
      return;
    }

    devAgentLogger.log('Step completed', payload);
  },

  onRunFinished: (event) => {
    const payload = {
      runId: event.runId,
      agentId: event.agentId,
      status: event.status,
      creditCost: event.creditCost,
    };

    if (event.status === 'FAILED') {
      devAgentLogger.error('Run finished with failure', undefined, payload);
      return;
    }

    if (event.status === 'PAUSED') {
      devAgentLogger.warn('Run paused', payload);
      return;
    }

    devAgentLogger.log(`Run finished: ${event.status}`, payload);
  },

  onSnapshot: (snapshot: RunSnapshot) => {
    devAgentLogger.log('Run snapshot', {
      runId: snapshot.runId,
      agentId: snapshot.agentId,
      stepsCompleted: snapshot.stepOutputs.length,
      stepKeys: snapshot.stepOutputs.map((step) => step.stepKey),
    });
  },
});

export const wrapEventPublisherForDev = (publisher: EventPublisher): EventPublisher => ({
  publish: async (event: RunEventPayload) => {
    if (isVerboseAgentDevLogging()) {
      const summary = summarizeEventData(event);
      const logContext: Record<string, unknown> = {
        runId: event.runId,
        agentId: event.agentId,
        ...summary,
      };

      if (event.type === 'step_failed' && 'error' in summary) {
        devAgentLogger.error(`Event: ${event.type}`, undefined, logContext);
      } else if (event.type === 'run_failed') {
        devAgentLogger.error(`Event: ${event.type}`, undefined, logContext);
      } else {
        devAgentLogger.log(`Event: ${event.type}`, logContext);
      }
    }

    await publisher.publish(event);
  },
});
