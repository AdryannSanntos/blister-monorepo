import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const finalizerBlockExecutor: BlockExecutorFn = async (ctx) => {
  const finalOutput = ctx.inputs.ui_output ?? ctx.inputs.default ?? ctx.inputs;
  return {
    outputs: { final: finalOutput },
    terminate: true,
  };
};
