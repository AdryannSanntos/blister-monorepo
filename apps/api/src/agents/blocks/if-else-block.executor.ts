import type { BlockExecutorFn } from '../agent-block-executor.registry';

export const ifElseBlockExecutor: BlockExecutorFn = async (ctx) => {
  const conditionPortKey =
    typeof ctx.blockConfig.conditionPortKey === 'string'
      ? ctx.blockConfig.conditionPortKey
      : 'condition';
  const condition = ctx.inputs[conditionPortKey];
  const branch = condition ? 'if' : 'else';
  return { outputs: { [branch]: ctx.inputs } };
};
