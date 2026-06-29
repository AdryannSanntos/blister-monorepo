import type { CarouselTemplateService } from '../services/carousel-template.service';

export type CarouselRunDeps = {
  templateService: CarouselTemplateService;
  renderSlideToPng: (params: {
    html: string;
    css: string;
    baseCss: string;
    width: number;
    height: number;
  }) => Promise<Buffer>;
  resolveFileUrl: (params: {
    fileId: string;
    companyId?: string;
    personalSpaceId?: string;
  }) => Promise<string>;
  storeRenderedPng: (params: {
    runId: string;
    slideId: string;
    slideOrder: number;
    buffer: Buffer;
    companyId?: string;
    personalSpaceId?: string;
  }) => Promise<string>;
  listOwnedTemplateIds: (params: {
    companyId?: string;
    personalSpaceId?: string;
  }) => Promise<string[]>;
};

let activeDeps: CarouselRunDeps | null = null;

export const getCarouselRunDeps = (): CarouselRunDeps => {
  if (!activeDeps) {
    throw new Error('Carousel run deps are not initialized');
  }
  return activeDeps;
};

export const setCarouselRunDeps = (deps: CarouselRunDeps): void => {
  activeDeps = deps;
};

export const resetCarouselRunDeps = (): void => {
  activeDeps = null;
};
