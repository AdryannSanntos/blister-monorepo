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

const splitIdeaPoints = (
  description: string | undefined,
  count: number,
  topic: string,
): string[] => {
  if (!description?.trim()) {
    return Array.from(
      { length: count },
      (_, index) => `Desenvolva o ponto ${index + 1} sobre ${topic} com um exemplo concreto.`,
    );
  }

  const sentences =
    description.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g)?.map((part) => part.trim()).filter(Boolean) ??
    [description.trim()];

  if (sentences.length >= count) return sentences.slice(0, count);

  const points = [...sentences];
  while (points.length < count) {
    points.push(`Aprofunde o argumento ${points.length + 1} sobre ${topic}.`);
  }

  return points;
};

const takeCtaSupport = (description: string, topic: string): string => {
  const sentences =
    description.match(/[^.!?…]+[.!?…]+(?:\s+|$)|[^.!?…]+$/g)?.map((part) => part.trim()).filter(Boolean) ??
    [description.trim()];

  return sentences[sentences.length - 1] ?? `Escolha uma ação de ${topic} para aplicar ainda hoje.`;
};

/**
 * Guarantees the content slide list has exactly `expectedCount` entries.
 *
 * Used as a last-resort fallback when the LLM under-delivers (e.g. collapses a
 * multi-slide carousel into a single cover) after every retry has been spent.
 * Rather than failing the whole run we synthesize the missing slides from the
 * selected idea so the pipeline completes and the user can edit the placeholder
 * copy at the content-approval step. Extra slides are trimmed. Roles/types are
 * intentionally left loose because `normalizeContentSlides` re-derives them from
 * position afterwards.
 */
export const padContentSlidesToCount = (
  slides: NormalizableContentSlide[],
  expectedCount: number,
  ideaHint?: { title?: string; description?: string },
): NormalizableContentSlide[] => {
  const sorted = [...slides].sort((left, right) => left.order - right.order);

  if (sorted.length >= expectedCount) {
    return sorted.slice(0, expectedCount).map((slide, index) => ({
      ...slide,
      id: `slide_${index + 1}`,
      order: index + 1,
    }));
  }

  const topic = ideaHint?.title?.trim() || 'este tema';
  const detail = ideaHint?.description?.trim();
  const middleCount = Math.max(expectedCount - 2, 0);
  const middlePoints = splitIdeaPoints(detail, middleCount, topic);
  const result: NormalizableContentSlide[] = sorted.map((slide, index) => ({
    ...slide,
    id: `slide_${index + 1}`,
    order: index + 1,
  }));

  if (result.length === 0) {
    result.push({
      id: 'slide_1',
      order: 1,
      type: 'start',
      narrativeRole: 'hook',
      title: topic,
      imageBrief: `Imagem de capa sobre ${topic}.`,
    });
  }

  while (result.length < expectedCount - 1) {
    const order = result.length + 1;
    const pointIndex = order - 2;
    const lead = middlePoints[pointIndex] ?? `Desenvolva o ponto ${pointIndex + 1} sobre ${topic}.`;
    result.push({
      id: `slide_${order}`,
      order,
      type: 'text',
      narrativeRole: 'scene',
      body: lead,
      body2: `Conecte este ponto com uma ação prática que o leitor pode aplicar hoje.`,
      subtitle: `Por que isso importa para quem quer evoluir em ${topic}.`,
    });
  }

  const ctaOrder = result.length + 1;
  result.push({
    id: `slide_${ctaOrder}`,
    order: ctaOrder,
    type: 'text',
    narrativeRole: 'cta',
    body: `O próximo passo sobre ${topic} começa com uma decisão simples.`,
    body2: detail ? takeCtaSupport(detail, topic) : `Escolha uma ação de ${topic} para aplicar ainda hoje.`,
    subtitle: 'Compartilhe com quem precisa ver isso.',
    callToAction: 'Qual insight você vai aplicar primeiro?',
  });

  return result.slice(0, expectedCount);
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
