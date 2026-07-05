import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import type { CarouselSlideType } from '@company-os/types';

export type ContentSlideRef = {
  id: string;
  order: number;
  type: CarouselSlideType;
};

export const resolveExpectedSlidesCount = (context: StepExecutionContext): number => {
  const input = context.inputPayload as {
    slidesCount?: number;
    settings?: { slidesCount?: number };
  };

  return input.slidesCount ?? input.settings?.slidesCount ?? 5;
};

export const resolveContentSlidesFromContext = <T extends ContentSlideRef>(
  context: StepExecutionContext,
): T[] => {
  const contentOutput = context.previousStepsOutput.generate_content as { slides?: T[] };

  return [...(contentOutput?.slides ?? [])].sort(
    (left, right) => left.order - right.order,
  );
};

export const alignSlidesToContent = <
  TContent extends ContentSlideRef,
  TExtra extends Record<string, unknown>,
>(
  contentSlides: TContent[],
  llmSlides: Array<Partial<TExtra> & ContentSlideRef>,
  createFallback: (contentSlide: TContent) => TExtra,
): Array<TContent & TExtra> =>
  contentSlides.map((contentSlide) => {
    const llmSlide = llmSlides.find((entry) => entry.id === contentSlide.id);

    if (llmSlide) {
      return {
        ...createFallback(contentSlide),
        ...llmSlide,
        id: contentSlide.id,
        order: contentSlide.order,
        type: contentSlide.type,
      } as TContent & TExtra;
    }

    return {
      ...contentSlide,
      ...createFallback(contentSlide),
    } as TContent & TExtra;
  });

export const enforceContentSlidesCount = <T extends ContentSlideRef>(
  slides: T[],
  expectedCount: number,
): T[] => {
  const sorted = [...slides].sort((left, right) => left.order - right.order);

  if (sorted.length === expectedCount) {
    return sorted.map((slide, index) => ({ ...slide, order: index + 1 }));
  }

  if (sorted.length > expectedCount) {
    return sorted.slice(0, expectedCount).map((slide, index) => ({ ...slide, order: index + 1 }));
  }

  throw new Error(
    `Content generation returned ${sorted.length} slide(s) but ${expectedCount} were requested`,
  );
};
