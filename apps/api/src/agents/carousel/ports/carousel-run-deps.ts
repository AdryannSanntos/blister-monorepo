import type {
  StepExecutionContext,
  StepResult,
  StepRuntimeDeps,
} from '@company-os/agent-ia-sdk/agents';

export type CarouselRunDeps = {
  completeGenerateIdeas?: (
    context: StepExecutionContext,
    deps: StepRuntimeDeps,
  ) => Promise<StepResult>;
  completeGenerateContent?: (
    context: StepExecutionContext,
    deps: StepRuntimeDeps,
  ) => Promise<StepResult>;
  completeGenerateDesignPlan?: (
    context: StepExecutionContext,
    deps: StepRuntimeDeps,
  ) => Promise<StepResult>;
  completeGenerateSlides?: (
    context: StepExecutionContext,
    deps: StepRuntimeDeps,
  ) => Promise<StepResult>;
  renderSlides?: (params: {
    slides: unknown[];
    templateId: string;
    socialNetwork: string;
  }) => Promise<void>;
};

let activeDeps: CarouselRunDeps | null = null;

export const getCarouselRunDeps = (): CarouselRunDeps => {
  if (!activeDeps) {
    throw new Error('Carousel run deps are not initialized');
  }
  return activeDeps;
};

export const setCarouselRunDeps = (deps: CarouselRunDeps): void => {
  activeDeps = deps;
};

export const resetCarouselRunDeps = (): void => {
  activeDeps = null;
};
