import type { CarouselDesignPlan, CarouselSlideDesign } from "./carousel";

export const buildImageUploadKey = (slideId: string, slotKey: string): string =>
  `${slideId}:${slotKey}`;

export const parseImageUploadKey = (key: string): { slideId: string; slotKey: string } => {
  const sep = key.indexOf(":");
  return { slideId: key.slice(0, sep), slotKey: key.slice(sep + 1) };
};

export const slideRequiresUploads = (slide: CarouselSlideDesign): boolean =>
  slide.imageSlots.some((slot) => slot.required);

export const countRequiredSlots = (plan: CarouselDesignPlan): number =>
  plan.slides.reduce(
    (count, slide) => count + slide.imageSlots.filter((slot) => slot.required).length,
    0,
  );

export const countFilledRequiredSlots = (
  plan: CarouselDesignPlan,
  imageUploads: Record<string, string>,
): number =>
  plan.slides.reduce((count, slide) => {
    for (const slot of slide.imageSlots) {
      if (!slot.required) continue;
      const key = buildImageUploadKey(slide.id, slot.slotKey);
      if (imageUploads[key]?.trim()) count += 1;
    }
    return count;
  }, 0);

export const allRequiredSlotsFilled = (
  plan: CarouselDesignPlan,
  imageUploads: Record<string, string>,
): boolean => countFilledRequiredSlots(plan, imageUploads) === countRequiredSlots(plan);
