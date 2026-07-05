import type { StepExecutor } from '@company-os/agent-ia-sdk/agents';
import { getCarouselRunDeps } from '../ports/carousel-run-deps';

type RenderableSlide = {
  id: string;
  order: number;
  type: string;
  htmlContent: string;
  cssContent: string;
  pngFileId?: string;
};

export const createRenderSlidesStep = (): StepExecutor => {
  return async (context) => {
    const deps = getCarouselRunDeps();
    const slidesOutput = context.previousStepsOutput.generate_slides as {
      slides?: RenderableSlide[];
    };
    const designOutput = context.previousStepsOutput.generate_design_plan as {
      plan?: { templateId: string };
    };

    const input = context.inputPayload as {
      templateId?: string;
      socialNetworks?: string[];
    };

    const slides = slidesOutput?.slides ?? [];
    if (slides.length === 0) {
      return {
        type: 'FAILED',
        error: 'No slides available to render',
      };
    }

    const templateId =
      designOutput?.plan?.templateId ??
      input.templateId ??
      'editorial-performance';
    const socialNetwork = input.socialNetworks?.[0] ?? 'instagram';
    const dimensions = deps.templateService.getDimensions(templateId, socialNetwork);

    const renderedSlides: RenderableSlide[] = [];

    for (const slide of slides) {
      const pngBuffer = await deps.renderSlideToPng({
        html: slide.htmlContent,
        css: slide.cssContent,
        baseCss: '',
        width: dimensions.width,
        height: dimensions.height,
      });

      const pngFileId = await deps.storeRenderedPng({
        runId: context.runId,
        slideId: slide.id,
        slideOrder: slide.order,
        buffer: pngBuffer,
        companyId: context.companyId,
      });

      renderedSlides.push({
        ...slide,
        pngFileId,
      });
    }

    return {
      type: 'CONTINUE',
      output: { slides: renderedSlides },
    };
  };
};
