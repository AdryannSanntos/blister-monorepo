import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const validationBlockExecutor: BlockExecutorFn = async (ctx) => {
  const mode = typeof ctx.blockConfig.mode === 'string' ? ctx.blockConfig.mode : 'internal';

  if (mode === 'human_review') {
    return {
      outputs: {},
      suspend: {
        type: 'validation',
        payload: {
          candidate: ctx.inputs.candidate ?? ctx.inputs.default,
          criteria: ctx.blockConfig.criteria,
          reference: ctx.inputs.reference,
        },
      },
    };
  }

  // Internal mode: auto-pass in phase 1
  return {
    outputs: {
      pass: ctx.inputs.candidate ?? ctx.inputs.default,
    },
  };
};
