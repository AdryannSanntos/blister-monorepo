/**
 * Usage reporting contract. The SDK reports raw consumption (tokens, images,
 * cost) per step; it does NOT know about credits, plans or limits — the app
 * adapter decides how to charge. This is intentionally separate from any
 * credit/debit concern.
 */
export interface UsageEvent {
  runId: string;
  stepKey: string;
  agentId: string;
  companyId: string;
  tokensInput: number;
  tokensOutput: number;
  imagesGenerated?: number;
  costUsd: number;
  model?: string;
}

export interface UsageReporter {
  reportUsage(event: UsageEvent): Promise<void>;
}

/** Usage reporter that does nothing — safe default when none is injected. */
export const createNoOpUsageReporter = (): UsageReporter => ({
  reportUsage: async () => {},
});

/** Usage reporter that collects events in memory — used by tests/harness. */
export const createCollectingUsageReporter = (): UsageReporter & { events: UsageEvent[] } => {
  const events: UsageEvent[] = [];
  return {
    events,
    reportUsage: async (event) => {
      events.push(event);
    },
  };
};
