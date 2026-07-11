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
import { CarouselAiEditService } from './carousel-ai-edit.service';

const bodySchema = z.object({
  slideId: z.string(),
  mode: z.enum(['rewrite_text', 'visual_edit']),
  prompt: z.string().min(1),
  layerId: z.string().optional(),
  currentHtmlContent: z.string().optional(),
  currentCssContent: z.string().optional(),
});

const aiEditRequestPipe = new ZodValidationPipe(bodySchema);

@Controller('agents/carousel')
export class CarouselAiEditController {
  private readonly logger = new Logger(CarouselAiEditController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly workspaceContext: WorkspaceContextService,
    private readonly agentRunService: AgentRunService,
    private readonly aiEdit: CarouselAiEditService,
  ) {}

  @Post('runs/:runId/ai-edit')
  @RequirePermission('generation.create')
  async aiEditSlide(@Param('runId') runId: string, @Body() body: unknown, @Req() req: Request) {
    const request = aiEditRequestPipe.transform(body) as z.infer<typeof bodySchema>;
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    const scope = toRunScope(workspace);
    await this.agentRunService.assertRunBelongsToWorkspace(runId, scope);

    const run = await this.prisma.agentRun.findFirst({ where: { id: runId, ...scope } });
    if (!run) throw new NotFoundException('Agent run not found');

    let output: CarouselOutput;
    try {
      output = carouselOutputSchema.parse(run.outputPayload);
    } catch (error) {
      this.logger.error(
        `Run ${runId} outputPayload failed carouselOutputSchema validation`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new BadRequestException('Run output is not in the expected carousel format yet');
    }
    const slide = output.slides.find((entry) => entry.id === request.slideId);
    if (!slide) throw new NotFoundException('Slide not found in this run');

    const htmlContent = request.currentHtmlContent ?? slide.htmlContent;
    const cssContent = request.currentCssContent ?? slide.cssContent;

    return this.aiEdit.applyEdit({
      request,
      templateId: output.templateId,
      slideType: slide.type,
      htmlContent,
      cssContent,
    });
  }
}
