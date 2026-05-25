import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const outputFormatterBlockExecutor: BlockExecutorFn = async (ctx) => {
  const blocks = Array.isArray(ctx.blockConfig.outputBlocks)
    ? ctx.blockConfig.outputBlocks
    : ['markdown'];

  const uiOutput = {
    type: 'ui_output',
    blocks: (blocks as string[]).map((b) => ({
      type: b,
      content: ctx.inputs[b] ?? ctx.inputs.default ?? ctx.inputs,
    })),
  };

  return { outputs: { ui_output: uiOutput } };
};
