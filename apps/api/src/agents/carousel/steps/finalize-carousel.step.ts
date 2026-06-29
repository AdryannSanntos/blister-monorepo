import type { StepExecutor } from '@company-os/agent-ia-sdk/agents';
import type { CarouselOutputSlide } from '@company-os/types';
import { carouselOutputZod } from '../schemas/carousel-schemas';
import { dedupeCarouselSlidesById } from '../utils/carousel-output.util';

export const createFinalizeCarouselStep = (): StepExecutor => {
  return async (context) => {
    const renderOutput = context.previousStepsOutput.render_slides as {
      slides?: CarouselOutputSlide[];
    };

    const input = context.inputPayload as {
      socialNetworks?: string[];
      templateId?: string;
    };

    const raw = {
      socialNetwork: (input.socialNetworks?.[0] ?? 'instagram') as 'instagram' | 'facebook' | 'tiktok',
      templateId: input.templateId ?? 'editorial-performance',
      slides: dedupeCarouselSlidesById(renderOutput?.slides ?? []),
    };

    const validated = carouselOutputZod.safeParse(raw);

    if (!validated.success) {
      return {
        type: 'FAILED',
        error: 'Carousel output validation failed',
      };
    }

    return {
      type: 'CONTINUE',
      output: validated.data as Record<string, unknown>,
    };
  };
};
