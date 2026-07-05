/**
 * Shared helpers for hydrating carousel slides in scripts.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CarouselSlideType } from '@company-os/types';
import type { CarouselTemplateService } from '../../src/agents/carousel/services/carousel-template.service';
import { assembleSlideCss } from '../../src/agents/carousel/utils/brand-theme.util';
import { hydrateSlideHtml } from '../../src/agents/carousel/utils/slide-template-engine';
import { PREVIEW_SAMPLES, type SampleBrand, type SampleSlide } from '../preview-samples';

export const DEFAULT_BRAND: SampleBrand = {
  brandName: 'Blister',
  instagramHandle: '@blister_os',
  accentColor: '#563BE7',
  metaRightMode: 'handle',
};

export const IMAGE_POOL = ['cover.jpg', 'tech.jpg', 'dash.jpg', 'device.jpg', 'team.jpg'];

export const resolveVariationIds = (entry: unknown): string[] => {
  if (Array.isArray(entry)) return entry;
  if (entry && typeof entry === 'object') return Object.keys(entry);
  return [];
};

export const resolveCanvasSize = (
  service: CarouselTemplateService,
  templateId: string,
): { width: number; height: number } => {
  const manifest = service.getTemplate(templateId);
  const dims = manifest.dimensions?.instagram;
  return {
    width: dims?.width ?? 1080,
    height: dims?.height ?? 1350,
  };
};

export const dataUriFromSampleDir = (sampleDir: string, file: string): string => {
  const buf = readFileSync(join(sampleDir, file));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
};

export const buildMinimalSlideContent = () => ({
  title: 'Título ==destaque== de teste',
  subtitle: 'Contexto',
  body: 'Corpo de apoio com ==termo== curto para validação visual.',
  body2: 'Segunda linha de apoio.',
  callToAction: 'Saiba mais',
  listItems: ['Item um', 'Item dois', 'Item três'],
});

export type HydratedSlide = {
  templateId: string;
  slideType: string;
  variationId: string;
  slideKey: string;
  html: string;
  css: string;
  width: number;
  height: number;
};

export const listAllTemplateIds = (service: CarouselTemplateService): string[] =>
  service.listTemplates().map((t) => t.id);

export const hydrateAllManifestVariations = (
  service: CarouselTemplateService,
  sampleDir: string,
): HydratedSlide[] => {
  if (!existsSync(sampleDir)) {
    throw new Error(`Sample image dir not found: ${sampleDir}`);
  }

  const slides: HydratedSlide[] = [];
  let counter = 0;

  for (const templateId of listAllTemplateIds(service)) {
    const manifest = service.getTemplate(templateId);
    const { width, height } = resolveCanvasSize(service, templateId);
    const sampleSet = PREVIEW_SAMPLES[templateId];
    const brand: SampleBrand = { ...DEFAULT_BRAND, ...sampleSet?.brand };

    for (const [dirType, entry] of Object.entries(manifest.slides)) {
      const schemaType = (dirType === 'text-image' ? 'text_image' : dirType) as CarouselSlideType;

      for (const variationId of resolveVariationIds(entry)) {
        counter += 1;
        const variation = service.getSlideVariation(templateId, schemaType, variationId);
        const sampleSlide = sampleSet?.slides.find(
          (s) => s.type === dirType && s.variationId === variationId,
        );

        const imageUrls: Record<string, string> = {
          image_url: dataUriFromSampleDir(
            sampleDir,
            sampleSlide?.image ?? IMAGE_POOL[counter % IMAGE_POOL.length],
          ),
          image_url_2: dataUriFromSampleDir(
            sampleDir,
            sampleSlide?.image2 ?? IMAGE_POOL[(counter + 1) % IMAGE_POOL.length],
          ),
        };
        if (sampleSlide?.image3) {
          imageUrls.image_url_3 = dataUriFromSampleDir(sampleDir, sampleSlide.image3);
        }

        const content = sampleSlide?.content ?? buildMinimalSlideContent();
        const slideKey = sampleSlide?.key ?? `${dirType}-${variationId}`;

        const html = hydrateSlideHtml({
          html: variation.html,
          slide: {
            id: slideKey,
            order: counter,
            type: schemaType,
            ...content,
          },
          variationId,
          templateId,
          brand,
          totalSlides: sampleSet?.slides.length ?? 10,
          imageUrls,
        });

        const css = assembleSlideCss({
          baseCss: variation.baseCss,
          slideCss: variation.css,
          brand,
        });

        slides.push({
          templateId,
          slideType: dirType,
          variationId,
          slideKey,
          html,
          css,
          width,
          height,
        });
      }
    }
  }

  return slides;
};

export const hydratePreviewSampleSlides = (
  service: CarouselTemplateService,
  templateId: string,
  sampleDir: string,
): HydratedSlide[] => {
  const sampleSet = PREVIEW_SAMPLES[templateId];
  if (!sampleSet) return [];

  const { width, height } = resolveCanvasSize(service, templateId);
  const brand: SampleBrand = { ...DEFAULT_BRAND, ...sampleSet.brand };
  const out: HydratedSlide[] = [];

  for (const [index, slide] of sampleSet.slides.entries()) {
    const variation = service.getSlideVariation(
      templateId,
      slide.type as CarouselSlideType,
      slide.variationId,
    );

    const imageUrls: Record<string, string> = {};
    if (slide.image) imageUrls.image_url = dataUriFromSampleDir(sampleDir, slide.image);
    if (slide.image2) imageUrls.image_url_2 = dataUriFromSampleDir(sampleDir, slide.image2);
    if (slide.image3) imageUrls.image_url_3 = dataUriFromSampleDir(sampleDir, slide.image3);

    const html = hydrateSlideHtml({
      html: variation.html,
      slide: {
        id: slide.key,
        order: index + 1,
        type: slide.type as CarouselSlideType,
        ...slide.content,
      },
      variationId: slide.variationId,
      templateId,
      brand,
      totalSlides: sampleSet.slides.length,
      imageUrls,
    });

    const css = assembleSlideCss({
      baseCss: variation.baseCss,
      slideCss: variation.css,
      brand,
    });

    out.push({
      templateId,
      slideType: slide.type,
      variationId: slide.variationId,
      slideKey: slide.key,
      html,
      css,
      width,
      height,
    });
  }

  return out;
};
