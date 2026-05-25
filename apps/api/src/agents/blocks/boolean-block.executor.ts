import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const booleanBlockExecutor: BlockExecutorFn = async (ctx) => {
  // Phase 1: evaluate based on presence/truthiness of subject input
  const subject = ctx.inputs.subject ?? ctx.inputs.default;
  const result = Boolean(subject);
  return {
    outputs: {
      [result ? 'true' : 'false']: ctx.inputs,
    },
  };
};
