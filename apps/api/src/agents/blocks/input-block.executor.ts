import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const inputBlockExecutor: BlockExecutorFn = async (ctx) => {
  const payload = ctx.inputs.payload ?? ctx.runState ?? {};
  return { outputs: { payload } };
};
