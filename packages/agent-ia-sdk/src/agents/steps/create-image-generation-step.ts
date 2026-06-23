import type { StepExecutionContext, StepExecutor, StepResult } from '../core/types';

export const createImageGenerationStep = (options: {
  promptStepKey?: string;
  promptField?: string;
}): StepExecutor => {
  const promptStepKey = options.promptStepKey ?? 'generate_prompt';
  const promptField = options.promptField ?? 'imagePrompt';

  return async (context, deps): Promise<StepResult> => {
    if (!deps.imageProvider) {
      return {
        type: 'FAILED',
        error: 'Image provider is required for image_generation steps',
      };
    }

    const promptStepOutput = context.previousStepsOutput[promptStepKey];
    const promptFromStep =
      promptStepOutput && typeof promptStepOutput[promptField] === 'string'
        ? String(promptStepOutput[promptField])
        : '';

    const prompt =
      promptFromStep || String((context.inputPayload as { userInput?: string }).userInput ?? '');

    if (!prompt) {
      return {
        type: 'FAILED',
        error: 'Image prompt is required for image generation',
      };
    }

    const result = await deps.imageProvider.generate({
      prompt,
      agentId: context.agentId,
    });

    return {
      type: 'CONTINUE',
      output: {
        imageUrl: result.imageUrl ?? result.base64,
        storageKey: result.storageKey,
        prompt,
        style: promptStepOutput?.style,
        colors: promptStepOutput?.colors,
      },
    };
  };
};
