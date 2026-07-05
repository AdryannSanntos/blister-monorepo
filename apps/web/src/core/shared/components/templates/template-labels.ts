import type { CarouselTemplateVariation } from "@company-os/types";

/** Group title for a slide family. */
export const slideTypeGroupLabel = (slideType: string): string => {
  if (slideType === "start") return "Capa";
  if (slideType === "text") return "Texto";
  if (slideType === "text-image") return "Imagem + Texto";
  return slideType;
};

const POSITION_LABEL: Record<string, string> = {
  start: "Imagem no topo",
  center: "Imagem ao centro",
  bottom: "Imagem abaixo",
};

const THEME_LABEL: Record<string, string> = {
  dark: "Escuro",
  white: "Claro",
  accent: "Destaque",
};

const TEXT_VARIATION_LABEL: Record<string, string> = {
  v1: "Accent",
  v2: "Fechamento",
  v3: "Escuro",
  v4: "Claro",
};

/** Human label for a single variation, used under each thumbnail. */
export const variationLabel = (
  variation: CarouselTemplateVariation,
): string => {
  if (variation.position && variation.theme) {
    return `${POSITION_LABEL[variation.position]} · ${THEME_LABEL[variation.theme]}`;
  }
  if (variation.slideType === "start") return "Capa";
  if (variation.slideType === "text") {
    return TEXT_VARIATION_LABEL[variation.id] ?? variation.id;
  }
  return variation.id;
};

const GROUP_ORDER = ["start", "text", "text-image"] as const;

export type VariationGroup = {
  slideType: string;
  label: string;
  variations: CarouselTemplateVariation[];
};

/** Groups variations by slide family in display order. */
export const groupVariations = (
  variations: CarouselTemplateVariation[],
): VariationGroup[] => {
  const buckets = new Map<string, CarouselTemplateVariation[]>();
  for (const variation of variations) {
    const list = buckets.get(variation.slideType) ?? [];
    list.push(variation);
    buckets.set(variation.slideType, list);
  }

  const ordered: VariationGroup[] = [];
  for (const slideType of GROUP_ORDER) {
    const list = buckets.get(slideType);
    if (list?.length) {
      ordered.push({
        slideType,
        label: slideTypeGroupLabel(slideType),
        variations: list,
      });
      buckets.delete(slideType);
    }
  }
  // Any unknown slide families keep insertion order at the end.
  for (const [slideType, list] of buckets) {
    ordered.push({
      slideType,
      label: slideTypeGroupLabel(slideType),
      variations: list,
    });
  }
  return ordered;
};
