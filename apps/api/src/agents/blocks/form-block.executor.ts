import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const formBlockExecutor: BlockExecutorFn = async (ctx) => {
  const title = typeof ctx.blockConfig.title === 'string' ? ctx.blockConfig.title : 'Formulário';
  const fields = Array.isArray(ctx.blockConfig.fields) ? ctx.blockConfig.fields : [];
  const generationInstructions =
    typeof ctx.blockConfig.generationInstructions === 'string'
      ? ctx.blockConfig.generationInstructions
      : undefined;

  return {
    outputs: {},
    suspend: {
      type: 'form',
      payload: {
        title,
        fields,
        generationInstructions,
        upstreamContext: ctx.inputs,
      },
    },
  };
};
