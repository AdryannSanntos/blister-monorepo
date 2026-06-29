import type { CarouselNarrativeRole } from '@company-os/types';

export type TruncatableSlideCopy = {
  narrativeRole?: CarouselNarrativeRole;
  title?: string;
  subtitle?: string;
  body?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
};

const truncate = (value: string | undefined, max: number): string | undefined => {
  if (!value) return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
};

export const applyCopyLimits = <T extends TruncatableSlideCopy>(slide: T): T => {
  const role = slide.narrativeRole;

  if (role === 'hook') {
    return {
      ...slide,
      subtitle: truncate(slide.subtitle ?? slide.body, 120),
      body: undefined,
    };
  }

  if (role === 'framework') {
    return {
      ...slide,
      listItems: slide.listItems?.slice(0, 4),
      callToAction: truncate(slide.callToAction, 80),
    };
  }

  if (role === 'cta') {
    const keyword =
      slide.ctaKeyword?.trim() ||
      slide.title?.split(/\s+/).slice(0, 2).join(' ').toUpperCase() ||
      slide.callToAction?.split(/\s+/)[0]?.toUpperCase();

    return {
      ...slide,
      ctaKeyword: truncate(keyword, 24),
      body: truncate(slide.body, 160),
      ctaHint: truncate(slide.ctaHint ?? slide.subtitle, 100),
      callToAction: truncate(slide.callToAction, 100),
    };
  }

  if (role === 'scene' || role === 'proof') {
    return {
      ...slide,
      body: truncate(slide.body, 280),
    };
  }

  return {
    ...slide,
    body: truncate(slide.body, 280),
  };
};
