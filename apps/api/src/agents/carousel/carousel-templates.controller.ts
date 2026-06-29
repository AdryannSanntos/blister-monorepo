import { Controller, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { getCarouselRunDeps } from './ports/carousel-run-deps';

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

    return {
      templates: templateIds.map((templateId) => {
        const manifest = deps.templateService.getTemplate(templateId);
        return {
          id: manifest.id,
          name: manifest.name,
          description: manifest.description,
          dimensions: manifest.dimensions,
          owned: true,
        };
      }),
    };
  }
}
