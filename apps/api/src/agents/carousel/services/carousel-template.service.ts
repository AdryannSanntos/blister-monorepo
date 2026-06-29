import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { CarouselImageSlot } from '@company-os/types';
import type {
  CarouselImageSlotManifest,
  CarouselSlideVariation,
  CarouselTemplateManifest,
  CarouselTemplateSummary,
  CarouselVariationManifest,
} from './template-manifest.types';

const IMAGE_PLACEHOLDER_REGEX = /\{\{(image_url(?:_\d+)?)\}\}/g;

const SCHEMA_TO_DIR: Record<string, string> = {
  text_image: 'text-image',
};

const DIR_TO_SCHEMA: Record<string, string> = {
  'text-image': 'text_image',
};

export class TemplateNotFoundError extends Error {
  constructor(templateId: string) {
    super(`Carousel template not found: ${templateId}`);
    this.name = 'TemplateNotFoundError';
  }
}

/** Resolves template root for dist (nest build), Trigger.dev workers, and local src. */
export const resolveCarouselTemplatesRoot = (explicit?: string): string => {
  if (explicit) return explicit;
  if (process.env.CAROUSEL_TEMPLATES_ROOT) return process.env.CAROUSEL_TEMPLATES_ROOT;

  const candidates = [
    // Trigger.dev ships templates via additionalFiles under src/ (cwd = build dir).
    join(process.cwd(), 'src/agents/carousel/templates'),
    join(process.cwd(), 'apps/api/src/agents/carousel/templates'),
    // Nest build copies assets next to the compiled service module.
    join(__dirname, '..', 'templates'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  return join(__dirname, '..', 'templates');
};

export class CarouselTemplateService {
  private readonly templatesRoot: string;
  private cache: Map<string, CarouselTemplateManifest> = new Map();
  private variationCache: Map<string, CarouselSlideVariation> = new Map();

  constructor(templatesRoot?: string) {
    this.templatesRoot = resolveCarouselTemplatesRoot(templatesRoot);
  }

  listTemplates(): CarouselTemplateSummary[] {
    if (!existsSync(this.templatesRoot)) return [];

    return readdirSync(this.templatesRoot)
      .filter((entry) => {
        const fullPath = join(this.templatesRoot, entry);
        return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'manifest.json'));
      })
      .map((entry) => {
        const manifest = this.getTemplate(entry);
        return {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description,
          dimensions: manifest.dimensions,
        };
      });
  }

  getTemplate(templateId: string): CarouselTemplateManifest {
    if (process.env.CAROUSEL_TEMPLATES_HOT_RELOAD === 'true') {
      this.cache.delete(templateId);
    }

    const cached = this.cache.get(templateId);
    if (cached) return cached;

    const manifestPath = join(this.templatesRoot, templateId, 'manifest.json');
    if (!existsSync(manifestPath)) {
      throw new TemplateNotFoundError(templateId);
    }

    const manifest = JSON.parse(
      readFileSync(manifestPath, 'utf8'),
    ) as CarouselTemplateManifest;
    this.cache.set(templateId, manifest);
    return manifest;
  }

  getAvailableVariations(templateId: string, slideType: string): string[] {
    const manifest = this.getTemplate(templateId);
    const dirType = SCHEMA_TO_DIR[slideType] ?? slideType;
    const slideEntry = manifest.slides[dirType] ?? manifest.slides[slideType];

    if (!slideEntry) return [];

    if (Array.isArray(slideEntry)) {
      return slideEntry;
    }

    return Object.keys(slideEntry);
  }

  getInstructions(templateId: string): string {
    const instructionsPath = join(this.templatesRoot, templateId, 'instructions.md');
    if (!existsSync(instructionsPath)) return '';
    return readFileSync(instructionsPath, 'utf8');
  }

  getImageSlotsForVariation(
    templateId: string,
    slideType: string,
    variationId: string,
  ): CarouselImageSlotManifest[] {
    const variation = this.getSlideVariation(templateId, slideType, variationId);
    return variation.imageSlots;
  }

  getSlideVariation(
    templateId: string,
    slideType: string,
    variationId: string,
  ): CarouselSlideVariation {
    const cacheKey = `${templateId}:${slideType}:${variationId}`;
    if (process.env.CAROUSEL_TEMPLATES_HOT_RELOAD === 'true') {
      this.variationCache.delete(cacheKey);
    }

    const cached = this.variationCache.get(cacheKey);
    if (cached) return cached;

    const manifest = this.getTemplate(templateId);
    const dirType = SCHEMA_TO_DIR[slideType] ?? slideType;
    const slideEntry = manifest.slides[dirType] ?? manifest.slides[slideType];

    if (!slideEntry) {
      throw new Error(`Slide type "${slideType}" not found in template "${templateId}"`);
    }

    const variationManifest = this.resolveVariationManifest(slideEntry, variationId);
    const variationDir = join(
      this.templatesRoot,
      templateId,
      'slides',
      dirType,
      variationId,
    );

    const htmlPath = join(variationDir, 'slide.html');
    const cssPath = join(variationDir, 'slide.css');
    if (!existsSync(htmlPath)) {
      throw new Error(
        `Variation ${variationId} for ${slideType} not found in template ${templateId}`,
      );
    }

    const html = readFileSync(htmlPath, 'utf8');
    const css = existsSync(cssPath) ? readFileSync(cssPath, 'utf8') : '';
    const baseCssPath = join(this.templatesRoot, templateId, 'shared', 'base.css');
    const baseCss = existsSync(baseCssPath) ? readFileSync(baseCssPath, 'utf8') : '';

    const manifestSlots = variationManifest?.imageSlots;
    const imageSlots =
      manifestSlots && manifestSlots.length > 0
        ? manifestSlots.map((slot) => ({
            slotKey: slot.slotKey,
            label: slot.label,
            required: slot.required ?? true,
          }))
        : this.scanImageSlotsFromHtml(html);

    const variation: CarouselSlideVariation = {
      templateId,
      slideType: DIR_TO_SCHEMA[dirType] ?? dirType,
      variationId,
      html,
      css,
      baseCss,
      imageSlots,
    };

    this.variationCache.set(cacheKey, variation);
    return variation;
  }

  getDimensions(
    templateId: string,
    socialNetwork: string,
  ): { width: number; height: number } {
    const manifest = this.getTemplate(templateId);
    const dimensions = manifest.dimensions[socialNetwork];
    if (!dimensions) {
      throw new Error(`Dimensions for "${socialNetwork}" not defined in template ${templateId}`);
    }
    return dimensions;
  }

  toCarouselImageSlots(slots: CarouselImageSlotManifest[]): CarouselImageSlot[] {
    return slots.map((slot) => ({
      slotKey: slot.slotKey as CarouselImageSlot['slotKey'],
      label: slot.label,
      required: slot.required ?? true,
    }));
  }

  private resolveVariationManifest(
    slideEntry: Record<string, CarouselVariationManifest> | string[],
    variationId: string,
  ): { imageSlots?: CarouselImageSlotManifest[] } | null {
    if (Array.isArray(slideEntry)) {
      if (!slideEntry.includes(variationId)) return null;
      return null;
    }

    const entry = slideEntry[variationId];
    if (!entry) return null;
    if (typeof entry === 'string') return null;
    return entry;
  }

  private scanImageSlotsFromHtml(html: string): CarouselImageSlotManifest[] {
    const keys = new Set<string>();
    for (const match of html.matchAll(IMAGE_PLACEHOLDER_REGEX)) {
      keys.add(match[1] ?? 'image_url');
    }

    return [...keys].map((slotKey, index) => ({
      slotKey,
      label: index === 0 ? 'Image' : `Image ${index + 1}`,
      required: true,
    }));
  }
}
