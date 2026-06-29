export type CarouselImageSlotManifest = {
  slotKey: string;
  label: string;
  required?: boolean;
};

export type CarouselVariationManifest =
  | string
  | {
      imageSlots?: CarouselImageSlotManifest[];
    };

export type CarouselSlideTypeManifest = Record<string, CarouselVariationManifest>;

export type CarouselTemplateManifest = {
  id: string;
  name: string;
  description: string;
  dimensions: Record<string, { width: number; height: number }>;
  slides: Record<string, CarouselSlideTypeManifest | string[]>;
};

export type CarouselSlideVariation = {
  templateId: string;
  slideType: string;
  variationId: string;
  html: string;
  css: string;
  baseCss: string;
  imageSlots: CarouselImageSlotManifest[];
};

export type CarouselTemplateSummary = {
  id: string;
  name: string;
  description: string;
  dimensions: Record<string, { width: number; height: number }>;
};
