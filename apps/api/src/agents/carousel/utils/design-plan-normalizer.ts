import type { CarouselNarrativeRole, CarouselSlideType } from '@company-os/types';

export type NormalizerContentSlide = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
  listItems?: string[];
  body?: string;
  body2?: string;
  subtitle?: string;
  callToAction?: string;
  imageBrief?: string;
};

export type NormalizerDesignSlide = {
  id: string;
  order: number;
  type: CarouselSlideType;
  variationId: string;
  layoutNotes: string;
  imageSlots: Array<{
    slotKey: string;
    label: string;
    required: boolean;
    fileId?: string;
    brief?: string;
  }>;
};

const TEXT_SYNTHESIS_VARIATIONS = ['v2', 'v3'] as const;

const wantsMultipleImages = (content?: NormalizerContentSlide): boolean => {
  const brief = content?.imageBrief?.toLowerCase() ?? '';
  return /miniatura|thumbnail|tr[eê]s fotos|3 fotos|colagem|sequ[eê]ncia|strip|galeria|m[uú]ltipl|exemplos visuais|antes e depois/.test(
    brief,
  );
};

const pickSceneVariation = (
  content: NormalizerContentSlide | undefined,
  order: number,
): string => {
  const listCount = content?.listItems?.length ?? 0;
  const bodyLength = content?.body?.length ?? 0;

  if (wantsMultipleImages(content)) return 'v3';
  if (listCount >= 2 && bodyLength <= 160) return listCount >= 3 ? 'v5' : 'v2';
  if (bodyLength >= 200) return 'v4';
  if (listCount >= 3) return 'v5';

  const cycle = ['v2', 'v4', 'v1', 'v5'] as const;
  return cycle[(order - 2) % cycle.length] ?? 'v2';
};

const pickProofVariation = (order: number): string => (order % 2 === 0 ? 'v5' : 'v1');

const pickTextSynthesisVariation = (order: number): string =>
  TEXT_SYNTHESIS_VARIATIONS[(order - 1) % TEXT_SYNTHESIS_VARIATIONS.length] ?? 'v2';

const CONTENT_MACHINE_TEXT_CYCLE = [
  { type: 'text' as const, variationId: 'v1' },
  { type: 'text' as const, variationId: 'v3' },
  { type: 'text' as const, variationId: 'v4' },
];

const CONTENT_MACHINE_IMAGE_CYCLE = [
  { type: 'text_image' as const, variationId: 'v5' },
  { type: 'text_image' as const, variationId: 'v3' },
  { type: 'text_image' as const, variationId: 'v4' },
  { type: 'text_image' as const, variationId: 'v1' },
  { type: 'text_image' as const, variationId: 'v2' },
];

type ContentMachineLayoutPick = {
  type: CarouselSlideType;
  variationId: string;
};

const toVariationKey = (pick: ContentMachineLayoutPick): string =>
  `${pick.type}:${pick.variationId}`;

const bumpContentMachinePick = (
  pick: ContentMachineLayoutPick,
  previousVariationKey: string,
  order: number,
): ContentMachineLayoutPick => {
  if (toVariationKey(pick) !== previousVariationKey) return pick;

  const pool =
    pick.type === 'text_image' ? CONTENT_MACHINE_IMAGE_CYCLE : CONTENT_MACHINE_TEXT_CYCLE;
  const alternatives = pool.filter((entry) => toVariationKey(entry) !== previousVariationKey);
  return alternatives[order % alternatives.length] ?? pick;
};

const pickContentMachineLayout = (
  content: NormalizerContentSlide | undefined,
  order: number,
  previousVariationKey: string,
): ContentMachineLayoutPick => {
  const hasImage =
    content?.type === 'text_image' || Boolean(content?.imageBrief?.trim());
  const hasSubtitle = Boolean(content?.subtitle?.trim());
  const hasBody2 = Boolean(content?.body2?.trim());
  const hasCta = Boolean(content?.callToAction?.trim());
  const role = content?.narrativeRole;
  const bodyLength = content?.body?.length ?? 0;
  const totalTextLength =
    bodyLength + (content?.body2?.length ?? 0) + (content?.subtitle?.length ?? 0);

  if (!hasImage) {
    const pick =
      CONTENT_MACHINE_TEXT_CYCLE[(order - 2) % CONTENT_MACHINE_TEXT_CYCLE.length] ??
      CONTENT_MACHINE_TEXT_CYCLE[0]!;
    return bumpContentMachinePick(pick, previousVariationKey, order);
  }

  if (role === 'proof') {
    const pick: ContentMachineLayoutPick =
      order % 2 === 0
        ? { type: 'text_image', variationId: 'v2' }
        : { type: 'text_image', variationId: 'v4' };
    return bumpContentMachinePick(pick, previousVariationKey, order);
  }

  if (hasCta && !hasSubtitle) {
    return bumpContentMachinePick(
      { type: 'text_image', variationId: 'v1' },
      previousVariationKey,
      order,
    );
  }

  if (hasBody2 || totalTextLength >= 280) {
    return bumpContentMachinePick(
      { type: 'text_image', variationId: 'v5' },
      previousVariationKey,
      order,
    );
  }

  if (hasSubtitle && totalTextLength >= 160) {
    return bumpContentMachinePick(
      { type: 'text_image', variationId: 'v3' },
      previousVariationKey,
      order,
    );
  }

  const pick =
    CONTENT_MACHINE_IMAGE_CYCLE[(order - 2) % CONTENT_MACHINE_IMAGE_CYCLE.length] ??
    CONTENT_MACHINE_IMAGE_CYCLE[0]!;
  return bumpContentMachinePick(pick, previousVariationKey, order);
};

const normalizeContentMachineSlide = (input: {
  slide: NormalizerDesignSlide;
  content?: NormalizerContentSlide;
  isFirst: boolean;
  isLast: boolean;
  order: number;
  previousVariationKey: string;
}): NormalizerDesignSlide => {
  const { slide, content, isFirst, isLast, order } = input;

  if (isFirst) {
    return { ...slide, type: 'start', variationId: 'v1' };
  }

  if (isLast) {
    return { ...slide, type: 'text', variationId: 'v2' };
  }

  const picked = pickContentMachineLayout(content, order, input.previousVariationKey);
  return { ...slide, type: picked.type, variationId: picked.variationId };
};

export const normalizeDesignPlanSlides = (
  slides: NormalizerDesignSlide[],
  contentSlides: NormalizerContentSlide[],
  options?: { templateId?: string },
): NormalizerDesignSlide[] => {
  const totalSlides = slides.length;
  let previousVariationKey = '';
  const isContentMachine = options?.templateId === 'content-machine';

  return slides.map((slide) => {
    const content = contentSlides.find((entry) => entry.id === slide.id);
    const role = content?.narrativeRole;
    const isFirst = slide.order === 1;
    const isLast = slide.order === totalSlides;

    if (isContentMachine) {
      const normalized = normalizeContentMachineSlide({
        slide,
        content,
        isFirst,
        isLast,
        order: slide.order,
        previousVariationKey,
      });
      previousVariationKey = `${normalized.type}:${normalized.variationId}`;
      return normalized;
    }

    let variationId = slide.variationId;
    let type = slide.type;

    if (isFirst) {
      type = 'start';
      variationId = 'v1';
    } else if (isLast) {
      type = 'text';
      variationId = 'v3';
    } else if (role === 'framework' && (content?.listItems?.length ?? 0) >= 3) {
      type = 'text';
      variationId = 'v1';
    } else if (role === 'proof') {
      type = 'text_image';
      variationId = pickProofVariation(slide.order);
    } else if (role === 'scene' && content?.type === 'text_image') {
      type = 'text_image';
      variationId = pickSceneVariation(content, slide.order);
    } else if (role === 'scene' && content?.type === 'text') {
      type = 'text';
      variationId = pickTextSynthesisVariation(slide.order);
    } else if (content?.type === 'text') {
      type = 'text';
      variationId =
        (content.listItems?.length ?? 0) >= 2 ? 'v2' : pickTextSynthesisVariation(slide.order);
    } else if (content?.type === 'text_image') {
      type = 'text_image';
      variationId = pickSceneVariation(content, slide.order);
    } else if ((content?.body?.length ?? 0) > 200 && hasImageIntent(content)) {
      type = 'text_image';
      variationId = 'v4';
    } else if ((content?.listItems?.length ?? 0) >= 2) {
      type = 'text';
      variationId = 'v2';
    }

    const variationKey = `${type}:${variationId}`;
    if (variationKey === previousVariationKey && !isFirst && !isLast) {
      if (type === 'text_image') {
        const alternatives = ['v2', 'v4', 'v1', 'v5', 'v3'].filter((id) => id !== variationId);
        variationId = alternatives[slide.order % alternatives.length] ?? 'v4';
      } else if (type === 'text') {
        variationId = variationId === 'v1' ? 'v2' : 'v1';
      }
    }

    previousVariationKey = `${type}:${variationId}`;

    return {
      ...slide,
      type,
      variationId,
    };
  });
};

const hasImageIntent = (content?: NormalizerContentSlide): boolean =>
  Boolean(content?.imageBrief?.trim());
