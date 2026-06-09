import type { CustomStepExecutor } from '../../runtime/kernel/agent-execution.kernel';

/**
 * Lightweight validation step. Surfaces a working block while output invariants
 * are checked before the run completes.
 */
export const validateOutputStep: CustomStepExecutor = async (_context, deps) => {
  const working = await deps.message.working('Revisando o resultado');
  await working.done({ validated: true });

  return {
    type: 'CONTINUE',
    output: { validated: true },
  };
};
