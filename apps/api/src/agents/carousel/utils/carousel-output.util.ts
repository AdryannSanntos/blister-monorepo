export const dedupeCarouselSlidesById = <T extends { id: string; order: number }>(
  slides: T[],
): T[] => {
  const byId = new Map<string, T>();

  for (const slide of slides) {
    const existing = byId.get(slide.id);
    if (!existing || slide.order < existing.order) {
      byId.set(slide.id, slide);
    }
  }

  return [...byId.values()].sort((a, b) => a.order - b.order);
};
