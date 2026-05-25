import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const decisionBlockExecutor: BlockExecutorFn = async (ctx) => {
  // Phase 1: route to first available route or default
  const routes: Array<{ key: string; label: string }> = Array.isArray(ctx.blockConfig.routes)
    ? (ctx.blockConfig.routes as Array<{ key: string; label: string }>)
    : [{ key: 'route_a', label: 'Default route' }];

  const selectedRoute = routes[0]?.key ?? 'route_a';
  return { outputs: { [selectedRoute]: ctx.inputs } };
};
