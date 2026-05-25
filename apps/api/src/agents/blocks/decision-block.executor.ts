import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const decisionBlockExecutor: BlockExecutorFn = async (ctx) => {
  const routes: Array<{ key: string; label: string }> = Array.isArray(ctx.blockConfig.routes)
    ? (ctx.blockConfig.routes as Array<{ key: string; label: string }>)
    : [];

  if (routes.length === 0) {
    throw new Error('decision block requires at least one route in config.routes');
  }

  // Phase 1: always takes the first route — LLM-based routing is a Phase 2 concern
  const selectedRoute = routes[0].key;
  return { outputs: { [selectedRoute]: ctx.inputs } };
};
