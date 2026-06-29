import type { CarouselNarrativeRole, CarouselSlideType } from '@company-os/types';

export type NormalizerContentSlide = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
  listItems?: string[];
  body?: string;
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

const CONTENT_MACHINE_SCENE_CYCLE = ['text:v1', 'text_image:v1', 'text_image:v2'] as const;

const pickContentMachineScene = (order: number): { type: CarouselSlideType; variationId: string } => {
  const pick = CONTENT_MACHINE_SCENE_CYCLE[(order - 2) % CONTENT_MACHINE_SCENE_CYCLE.length];
  if (!pick) return { type: 'text', variationId: 'v1' };
  const [typeKey, variationId] = pick.split(':');
  return {
    type: typeKey === 'text_image' ? 'text_image' : 'text',
    variationId,
  };
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
  const role = content?.narrativeRole;

  let variationId = slide.variationId;
  let type = slide.type;

  if (isFirst) {
    return { ...slide, type: 'start', variationId: 'v1' };
  }

  if (isLast) {
    return { ...slide, type: 'text', variationId: 'v2' };
  }

  if (role === 'proof' || (content?.type === 'text_image' && content.imageBrief?.trim())) {
    type = 'text_image';
    variationId = role === 'proof' ? 'v2' : 'v1';
  } else if (role === 'scene' && content?.type === 'text_image') {
    type = 'text_image';
    variationId = 'v1';
  } else if (role === 'framework' || content?.type === 'text') {
    type = 'text';
    variationId = 'v1';
  } else if (content?.type === 'text_image') {
    type = 'text_image';
    variationId = 'v2';
  } else {
    const picked = pickContentMachineScene(order);
    type = picked.type;
    variationId = picked.variationId;
  }

  const variationKey = `${type}:${variationId}`;
  if (variationKey === input.previousVariationKey) {
    if (type === 'text_image') {
      variationId = variationId === 'v1' ? 'v2' : 'v1';
    } else {
      variationId = 'v1';
    }
  }

  return { ...slide, type, variationId };
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
