import type { StepExecutionContext } from '@company-os/agent-ia-sdk/agents';
import type {
  CarouselBrandContext,
  CarouselNarrativeRole,
  CarouselSlideType,
} from '@company-os/types';
import { resolveCarouselBrandContext } from './carousel-brand.util';

type ContentSlide = {
  id: string;
  order: number;
  type: CarouselSlideType;
  narrativeRole?: CarouselNarrativeRole;
  title?: string;
  subtitle?: string;
  body?: string;
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

  const contentOutput = context.previousStepsOutput.generate_content as {
    slides?: ContentSlide[];
  };
  const awaitsContentOutput = context.previousStepsOutput.await_content_approval as {
    slides?: ContentSlide[];
  };
  const designOutput = context.previousStepsOutput.generate_design_plan as {
    plan?: { templateId: string; slides: DesignPlanSlide[] };
  };
  const awaitsDesignOutput = context.previousStepsOutput.await_design_approval as {
    plan?: { templateId: string; slides: DesignPlanSlide[] };
    imageUploads?: Record<string, string>;
  };

  const slides = awaitsContentOutput?.slides ?? contentOutput?.slides ?? [];
  const plan = awaitsDesignOutput?.plan ?? designOutput?.plan;

  const brand = resolveCarouselBrandContext({
    brandOverrides: inputPayload.brandOverrides,
    agentSettings: inputPayload.settings,
    workspaceDisplayName: inputPayload.workspaceDisplayName,
    workspacePalette: inputPayload.workspacePalette,
  });

  return {
    templateId: plan?.templateId ?? inputPayload.templateId ?? 'editorial-performance',
    slides,
    plan,
    imageUploads: {
      ...(inputPayload.imageUploads ?? {}),
      ...(awaitsDesignOutput?.imageUploads ?? {}),
    },
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
