import type { StepExecutionContext, StepResult } from '../../runtime/kernel/types';
import { validateCopywriterOutput } from '../schemas/output.schema';

export async function executeValidateOutputStep(
  context: StepExecutionContext,
): Promise<StepResult> {
  const { previousStepsOutput } = context;

  const captionOutput = previousStepsOutput.generate_caption;
  if (!captionOutput) {
    return {
      type: 'FAILED',
      error: 'No caption output from previous step',
    };
  }

  const validation = validateCopywriterOutput(captionOutput);

  if (!validation.valid) {
    return {
      type: 'FAILED',
      error: `Output validation failed: ${validation.errors?.join('; ')}`,
    };
  }

  const finalOutput = {
    ...validation.data,
    reviewStatus: 'PENDING',
  };

  return {
    type: 'CONTINUE',
    output: {
      ...finalOutput,
      validated: true,
      validationPassed: true,
    },
  };
}
