import type { CarouselSlideType, CarouselNarrativeRole } from '@company-os/types';

type SlideInput = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
};

const TEXT_MIDDLE_VARIATIONS = ['v1', 'v3', 'v4'] as const;
const TEXT_IMAGE_POSITIONS = ['start', 'center', 'bottom'] as const;
const TEXT_IMAGE_THEMES = ['dark', 'white', 'accent'] as const;

/**
 * Deterministic variation assignment for the content-machine template.
 * Replaces the generate_design_plan LLM step for this template.
 */
export const resolveContentMachineVariations = (
  slides: SlideInput[],
): Map<string, string> => {
  const result = new Map<string, string>();
  const totalSlides = slides.length;
  let textMiddleIndex = 0;
  let textImageIndex = 0;

  for (const slide of slides) {
    const isLastSlide = slide.order === totalSlides;
    const isCta = slide.narrativeRole === 'cta' || isLastSlide;

    switch (slide.type) {
      case 'start':
        result.set(slide.id, 'v1');
        break;

      case 'text': {
        if (isCta) {
          result.set(slide.id, 'v2');
        } else {
          const variation = TEXT_MIDDLE_VARIATIONS[textMiddleIndex % TEXT_MIDDLE_VARIATIONS.length];
          result.set(slide.id, variation ?? 'v1');
          textMiddleIndex++;
        }
        break;
      }

      case 'text_image': {
        const isProof = slide.narrativeRole === 'proof';
        const theme = TEXT_IMAGE_THEMES[textImageIndex % TEXT_IMAGE_THEMES.length] ?? 'dark';
        if (isProof) {
          result.set(slide.id, `bottom-${theme}`);
        } else {
          const position = TEXT_IMAGE_POSITIONS[textImageIndex % TEXT_IMAGE_POSITIONS.length] ?? 'start';
          result.set(slide.id, `${position}-${theme}`);
        }
        textImageIndex++;
        break;
      }

      default:
        result.set(slide.id, 'v1');
    }
  }

  return result;
};
