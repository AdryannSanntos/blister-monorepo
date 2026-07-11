import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import type {
  CarouselBrandContext,
  CarouselNarrativeRole,
  CarouselSlideType,
} from '@company-os/types';
import { resolveCarouselBrandContext } from './carousel-brand.util';
import { resolveContentSlidesFromContext } from './slide-count-alignment.util';
import { resolveContentMachineVariations } from './content-machine-variation-resolver';

type ContentSlide = {
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

type DesignPlanSlide = {
  id: string;
  variationId: string;
  layoutNotes?: string;
  imageSlots?: Array<{ slotKey: string; label: string; fileId?: string; brief?: string }>;
};

export type SlidesGenerationContext = {
  templateId: string;
  slides: ContentSlide[];
  plan?: {
    templateId: string;
    slides: DesignPlanSlide[];
  };
  imageUploads: Record<string, string>;
  brand: CarouselBrandContext;
  totalSlides: number;
};

const buildContentMachinePlan = (
  templateId: string,
  slides: ContentSlide[],
): SlidesGenerationContext['plan'] => {
  const variationMap = resolveContentMachineVariations(slides);
  return {
    templateId,
    slides: slides.map((slide) => ({
      id: slide.id,
      variationId: variationMap.get(slide.id) ?? 'v1',
    })),
  };
};

export const resolveSlidesGenerationContext = (
  context: StepExecutionContext,
): SlidesGenerationContext => {
  const inputPayload = context.inputPayload as {
    templateId?: string;
    brandOverrides?: {
      brandName?: string;
      instagramHandle?: string;
      accentColor?: string;
    };
    settings?: unknown;
    workspaceDisplayName?: string;
    workspacePalette?: string[];
    imageUploads?: Record<string, string>;
  };

  const templateId = inputPayload.templateId ?? 'editorial-performance';
  const slides = resolveContentSlidesFromContext<ContentSlide>(context);

  const brand = resolveCarouselBrandContext({
    brandOverrides: inputPayload.brandOverrides,
    agentSettings: inputPayload.settings,
    workspaceDisplayName: inputPayload.workspaceDisplayName,
    workspacePalette: inputPayload.workspacePalette,
  });

  // Build a synthetic plan from the content slides instead of relying on the
  // (now removed) generate_design_plan LLM step.
  const plan =
    templateId === 'content-machine'
      ? buildContentMachinePlan(templateId, slides)
      : undefined;

  return {
    templateId,
    slides,
    plan,
    imageUploads: inputPayload.imageUploads ?? {},
    brand,
    totalSlides: slides.length,
  };
};

export const resolveSlideVariationId = (
  slideId: string,
  plan?: { slides?: DesignPlanSlide[] },
): string => {
  const design = plan?.slides?.find((entry) => entry.id === slideId);
  return design?.variationId ?? 'v1';
};
