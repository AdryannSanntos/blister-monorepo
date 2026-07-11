import type { CarouselNarrativeRole } from '@company-os/types';

export type TruncatableSlideCopy = {
  narrativeRole?: CarouselNarrativeRole;
  title?: string;
  subtitle?: string;
  body?: string;
  body2?: string;
  callToAction?: string;
  ctaKeyword?: string;
  ctaHint?: string;
  listItems?: string[];
};

export type CopyLimitsOptions = {
  templateId?: string;
};

const truncate = (value: string | undefined, max: number): string | undefined => {
  if (!value) return value;
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
};

const resolveLimits = (templateId?: string) => {
  const isContentMachine = templateId === 'content-machine';
  return {
    body: isContentMachine ? 220 : 280,
    body2: isContentMachine ? 220 : 0,
    subtitle: isContentMachine ? 220 : 160,
    callToAction: isContentMachine ? 220 : 100,
    ctaBody: isContentMachine ? 220 : 160,
    ctaBody2: isContentMachine ? 220 : 0,
    ctaHint: isContentMachine ? 160 : 100,
    ctaKeyword: isContentMachine ? 32 : 24,
    frameworkCta: isContentMachine ? 220 : 80,
  };
};

export const applyCopyLimits = <T extends TruncatableSlideCopy>(
  slide: T,
  options?: CopyLimitsOptions,
): T => {
  const limits = resolveLimits(options?.templateId);
  const role = slide.narrativeRole;

  if (role === 'hook') {
    const titleLimit = options?.templateId === 'content-machine' ? 120 : 80;
    return {
      ...slide,
      title: truncate(slide.title, titleLimit),
      subtitle: truncate(slide.subtitle ?? slide.body, 120),
      body: undefined,
      body2: undefined,
      listItems: undefined,
    };
  }

  if (role === 'framework') {
    return {
      ...slide,
      listItems: slide.listItems?.slice(0, 4),
      callToAction: truncate(slide.callToAction, limits.frameworkCta),
    };
  }

  if (role === 'cta') {
    const keyword =
      slide.ctaKeyword?.trim() ||
      slide.title?.split(/\s+/).slice(0, 2).join(' ').toUpperCase() ||
      slide.callToAction?.split(/\s+/)[0]?.toUpperCase();

    return {
      ...slide,
      ctaKeyword: truncate(keyword, limits.ctaKeyword),
      body: truncate(slide.body, limits.ctaBody),
      body2: limits.body2 ? truncate(slide.body2, limits.ctaBody2) : slide.body2,
      subtitle: truncate(slide.subtitle, limits.subtitle),
      ctaHint: truncate(slide.ctaHint ?? slide.subtitle, limits.ctaHint),
      callToAction: truncate(slide.callToAction, limits.callToAction),
    };
  }

  if (role === 'scene' || role === 'proof') {
    return {
      ...slide,
      body: truncate(slide.body, limits.body),
      body2: limits.body2 ? truncate(slide.body2, limits.body2) : slide.body2,
      subtitle: truncate(slide.subtitle, limits.subtitle),
      callToAction: truncate(slide.callToAction, limits.callToAction),
    };
  }

  return {
    ...slide,
    body: truncate(slide.body, limits.body),
    body2: limits.body2 ? truncate(slide.body2, limits.body2) : slide.body2,
    subtitle: truncate(slide.subtitle, limits.subtitle),
    callToAction: truncate(slide.callToAction, limits.callToAction),
  };
};
