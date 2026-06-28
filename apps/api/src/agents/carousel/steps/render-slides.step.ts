import type { StepExecutor } from '@company-os/agent-ia-sdk/agents';

/**
 * Preparation step: marks slides as render-ready.
 * For Plano 2 this is a no-op — slides carry htmlContent/cssContent directly.
 * In Plano 3+ this would call a headless browser renderer and store PNGs.
 */
export const createRenderSlidesStep = (): StepExecutor => {
  return async (context) => {
    const slidesOutput = context.previousStepsOutput.generate_slides as {
      slides?: unknown[];
    };

    const slides = slidesOutput?.slides ?? [];

    return {
      type: 'CONTINUE',
      output: { slides },
    };
  };
};
