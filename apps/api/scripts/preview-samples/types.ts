/**
 * Shared types for per-template preview sample content. Each template owns one
 * file in this directory (e.g. spotlight.ts) exporting a default SampleSet.
 */

export type SampleSlide = {
  key: string;
  type: string;
  variationId: string;
  image?: string;
  image2?: string;
  image3?: string;
  content: {
    title?: string;
    body?: string;
    body2?: string;
    subtitle?: string;
    callToAction?: string;
    listItems?: string[];
  };
};

export type SampleBrand = {
  brandName: string;
  instagramHandle: string;
  accentColor: string;
  metaRightMode: 'handle' | 'date';
};

export type SampleSet = {
  brand?: Partial<SampleBrand>;
  slides: SampleSlide[];
};
