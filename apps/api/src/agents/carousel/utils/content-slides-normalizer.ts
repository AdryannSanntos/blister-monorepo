import type { CarouselNarrativeRole, CarouselSlideType } from '@company-os/types';

export type NormalizableContentSlide = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
  title?: string;
  subtitle?: string;
  body?: string;
  body2?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  imageBrief?: string;
  listItems?: string[];
};

const hasImageIntent = (slide: NormalizableContentSlide): boolean =>
  Boolean(slide.imageBrief?.trim());

const isTextHeavy = (slide: NormalizableContentSlide): boolean =>
  (slide.body?.length ?? 0) +
    (slide.body2?.length ?? 0) +
    (slide.subtitle?.length ?? 0) >=
  180;

const isListHeavy = (slide: NormalizableContentSlide): boolean =>
  (slide.listItems?.length ?? 0) >= 2;

const resolveMiddleSlideType = (
  slide: NormalizableContentSlide,
  sceneIndex: number,
): CarouselSlideType => {
  const role = slide.narrativeRole;

  if (role === 'framework') return 'text';
  if (role === 'proof') return 'text_image';

  if (role === 'scene') {
    if (!hasImageIntent(slide) && !isListHeavy(slide) && sceneIndex % 2 === 1) {
      return 'text';
    }
    if (isTextHeavy(slide) && hasImageIntent(slide)) return 'text_image';
    if (isListHeavy(slide) && hasImageIntent(slide)) return 'text_image';
    if (hasImageIntent(slide)) return 'text_image';
    return sceneIndex % 2 === 0 ? 'text_image' : 'text';
  }

  if (hasImageIntent(slide)) return 'text_image';
  if (isListHeavy(slide)) return 'text';
  return sceneIndex % 2 === 0 ? 'text_image' : 'text';
};

export const normalizeContentSlides = <T extends NormalizableContentSlide>(
  slides: T[],
): T[] => {
  const totalSlides = slides.length;
  let sceneCounter = 0;

  return slides.map((slide) => {
    const isFirst = slide.order === 1;
    const isLast = slide.order === totalSlides;

    if (isFirst) {
      return { ...slide, type: 'start' as const, narrativeRole: slide.narrativeRole ?? 'hook' };
    }

    if (isLast) {
      return { ...slide, type: 'text' as const, narrativeRole: slide.narrativeRole ?? 'cta' };
    }

    const role = slide.narrativeRole ?? 'scene';
    const sceneIndex = role === 'scene' || role === 'proof' ? sceneCounter++ : sceneCounter;

    let type = slide.type;
    if (role === 'framework') {
      type = 'text';
    } else if (role === 'cta') {
      type = 'text';
    } else {
      type = resolveMiddleSlideType({ ...slide, narrativeRole: role }, sceneIndex);
    }

    return { ...slide, type, narrativeRole: role };
  });
};
