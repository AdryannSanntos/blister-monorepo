import {
  BadRequestException,
  Body,
  Controller,
  Logger,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { carouselOutputSchema, type CarouselOutput } from '@company-os/types';
import { Request } from 'express';
import { z } from 'zod';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { AgentRunService, toRunScope } from '../runtime/agent-run.service';
import { getCarouselRunDeps } from './ports/carousel-run-deps';

const renderRequestSchema = z.object({
  slideIds: z.array(z.string()).optional(),
});

const renderRequestPipe = new ZodValidationPipe(renderRequestSchema);

@Controller('agents/carousel')
export class CarouselRenderController {
  private readonly logger = new Logger(CarouselRenderController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly agentRunService: AgentRunService,
  ) {}

  @Post('runs/:runId/render')
  @RequirePermission('generation.create')
  async renderRun(
    @Param('runId') runId: string,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const { slideIds } = renderRequestPipe.transform(body) as z.infer<typeof renderRequestSchema>;
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    const scope = toRunScope(workspace);
    await this.agentRunService.assertRunBelongsToWorkspace(runId, scope);

    const run = await this.prisma.agentRun.findFirst({ where: { id: runId, ...scope } });
    if (!run) throw new NotFoundException('Agent run not found');

    let parsed: CarouselOutput;
    try {
      parsed = carouselOutputSchema.parse(run.outputPayload);
    } catch (error) {
      this.logger.error(
        `Run ${runId} outputPayload failed carouselOutputSchema validation`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Run output is not in the expected carousel format yet');
    }
    const deps = getCarouselRunDeps();
    const dimensions = { width: 1080, height: 1350 };

    const targets = slideIds?.length
      ? parsed.slides.filter((slide) => slideIds.includes(slide.id))
      : parsed.slides;

    const rendered = await Promise.all(
      targets.map(async (slide) => {
        const buffer = await deps.renderSlideToPng({
          html: slide.htmlContent,
          css: slide.cssContent,
          baseCss: '',
          width: dimensions.width,
          height: dimensions.height,
        });
        const pngFileId = await deps.storeRenderedPng({
          runId,
          slideId: slide.id,
          slideOrder: slide.order,
          buffer,
          companyId: workspace.companyId,
        });
        return { ...slide, pngFileId };
      }),
    );

    const byId = new Map(rendered.map((slide) => [slide.id, slide]));
    const slides = parsed.slides.map((slide) => byId.get(slide.id) ?? slide);

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: { outputPayload: { ...parsed, slides } },
    });

    return { slides };
  }
}
