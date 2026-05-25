import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const clarificationBlockExecutor: BlockExecutorFn = async (ctx) => {
  const template =
    typeof ctx.blockConfig.questionTemplate === 'string'
      ? ctx.blockConfig.questionTemplate
      : 'Preciso de mais informações para continuar.';

  return {
    outputs: {},
    suspend: {
      type: 'clarification',
      payload: {
        question: template,
        inputs: ctx.inputs,
      },
    },
  };
};
