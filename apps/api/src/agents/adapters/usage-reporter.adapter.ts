import { Logger } from '@nestjs/common';
import type { UsageEvent, UsageSdkReporter } from '@company-os/agent-ia-sdk/agents';
import { devAgentLogger } from '../runtime/dev-agent-logger';

const logger = new Logger('AgentUsageReporter');

/**
 * Reports raw LLM/image usage per step (tokens, cost). Credit debiting is
 * handled separately by the billing reporter in the kernel; this adapter exists
 * for observability/analytics. Replace the log with a metrics sink when needed.
 */
export const createUsageReporter = (): UsageSdkReporter => ({
  reportUsage: async (event: UsageEvent) => {
    devAgentLogger.log('LLM usage reported', {
      runId: event.runId,
      stepKey: event.stepKey,
      agentId: event.agentId,
      tokensInput: event.tokensInput,
      tokensOutput: event.tokensOutput,
      costUsd: event.costUsd,
      model: event.model ?? 'n/a',
    });

    logger.debug(
      `usage run=${event.runId} step=${event.stepKey} agent=${event.agentId} ` +
        `tokensIn=${event.tokensInput} tokensOut=${event.tokensOutput} costUsd=${event.costUsd} ` +
        `model=${event.model ?? 'n/a'}`,
    );
  },
});
