/**
 * Per-agent learning serializers. When a run review is approved/edited/rejected
 * the app serializes the feedback into a markdown note indexed in RAG as
 * AGENT_LEARNING, so future runs can repeat what worked and avoid what didn't.
 */
export interface LearningHandler<TFeedback = unknown, TInsights = unknown> {
  serialize: (feedback: TFeedback) => string;
  extractInsights?: (feedback: TFeedback) => TInsights;
}

export class LearningSerializerRegistry {
  private static handlers = new Map<string, LearningHandler<never, never>>();

  static register<TFeedback, TInsights>(
    agentId: string,
    handler: LearningHandler<TFeedback, TInsights>,
  ): void {
    LearningSerializerRegistry.handlers.set(
      agentId,
      handler as unknown as LearningHandler<never, never>,
    );
  }

  static has(agentId: string): boolean {
    return LearningSerializerRegistry.handlers.has(agentId);
  }

  static serialize(agentId: string, feedback: unknown): string | null {
    const handler = LearningSerializerRegistry.handlers.get(agentId);
    if (!handler) return null;
    return handler.serialize(feedback as never);
  }

  static extractInsights(agentId: string, feedback: unknown): unknown | null {
    const handler = LearningSerializerRegistry.handlers.get(agentId);
    if (!handler?.extractInsights) return null;
    return handler.extractInsights(feedback as never);
  }

  /** Test helper: forget all registered handlers. */
  static clear(): void {
    LearningSerializerRegistry.handlers.clear();
  }
}
