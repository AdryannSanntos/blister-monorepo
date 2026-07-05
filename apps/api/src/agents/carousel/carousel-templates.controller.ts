import { Controller, Get, Req } from '@nestjs/common';
import type {
  CarouselTemplatePreview,
  CarouselTemplateVariation,
} from '@company-os/types';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { getCarouselRunDeps } from './ports/carousel-run-deps';
import type { CarouselTemplateService } from './services/carousel-template.service';

const PREVIEW_BASE = '/templates';

const ACCENT_BY_TEMPLATE: Record<string, string> = {
  'content-machine': '#563BE7',
  'editorial-performance': '#563BE7',
  'minimal-clean': '#0A0A0A',
};

const POSITION_THEME_PATTERN = /^(start|center|bottom)-(dark|white|accent)$/;

/** Maps a (slideType, variationId) pair to its committed PNG filename. */
const previewFileName = (slideType: string, variationId: string): string => {
  if (slideType === 'start') return `start-${variationId}`;
  if (slideType === 'text') return `text-${variationId}`;
  return variationId;
};

const buildVariations = (
  templateService: CarouselTemplateService,
  templateId: string,
): CarouselTemplateVariation[] => {
  const manifest = templateService.getTemplate(templateId);
  const variations: CarouselTemplateVariation[] = [];

  for (const slideType of Object.keys(manifest.slides)) {
    const variationIds = templateService.getAvailableVariations(
      templateId,
      slideType,
    );

    for (const variationId of variationIds) {
      const match = POSITION_THEME_PATTERN.exec(variationId);
      variations.push({
        id: variationId,
        slideType,
        ...(match
          ? {
              position: match[1] as CarouselTemplateVariation['position'],
              theme: match[2] as CarouselTemplateVariation['theme'],
            }
          : {}),
        previewUrl: `${PREVIEW_BASE}/${templateId}/${previewFileName(slideType, variationId)}.png`,
      });
    }
  }

  return variations;
};

@Controller('agents/carousel')
export class CarouselTemplatesController {
  constructor(private readonly workspaceContext: WorkspaceContextService) {}

  @Get('templates')
  @RequirePermission('generation.create')
  async listTemplates(@Req() req: Request) {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    const deps = getCarouselRunDeps();

    const templateIds = await deps.listOwnedTemplateIds({
      companyId: workspace.companyId,
    });

    const templates: CarouselTemplatePreview[] = templateIds.map((templateId) => {
      const manifest = deps.templateService.getTemplate(templateId);
      return {
        id: manifest.id,
        name: manifest.name,
        description: manifest.description,
        accentColor: ACCENT_BY_TEMPLATE[templateId],
        coverPreviewUrl: `${PREVIEW_BASE}/${templateId}/cover.png`,
        owned: true,
        variations: buildVariations(deps.templateService, templateId),
      };
    });

    return { templates };
  }
}
