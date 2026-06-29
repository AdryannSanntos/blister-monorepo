import { CarouselTemplateService } from '../../src/agents/carousel/services/carousel-template.service';
import type { CarouselRunDeps } from '../../src/agents/carousel/ports/carousel-run-deps';

export const createStubCarouselRunDeps = (
  overrides?: Partial<CarouselRunDeps>,
): CarouselRunDeps => {
  const templateService = new CarouselTemplateService();
  return {
    templateService,
    renderSlideToPng: async () => Buffer.from('stub-png'),
    resolveFileUrl: async () => 'https://example.com/stub-image.png',
    storeRenderedPng: async ({ slideId }) => `stub-png-${slideId}`,
    listOwnedTemplateIds: async () =>
      templateService.listTemplates().map((template) => template.id),
    ...overrides,
  };
};
