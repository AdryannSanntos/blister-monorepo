import { carouselOutputSchema } from '@company-os/types';
import {
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import JSZip from 'jszip';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';
import type { CurrentUser } from '../../auth/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { WorkspaceContextService } from '../../workspace/workspace-context.service';
import { toRunScope } from '../runtime/agent-run.service';

@Controller('agents/carousel')
export class CarouselExportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly workspaceContext: WorkspaceContextService,
  ) {}

  @Get('runs/:runId/export')
  @RequirePermission('generation.create')
  async exportRun(
    @Param('runId') runId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const user = (req as unknown as { currentUser: CurrentUser }).currentUser;
    const workspace = await this.workspaceContext.resolveFromRequest(user.id, req);
    const scope = toRunScope(workspace);

    const run = await this.prisma.agentRun.findFirst({
      where: { id: runId, ...scope },
    });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    if (run.status !== 'COMPLETED') {
      throw new ConflictException('Carousel export is only available for completed runs');
    }

    const parsedOutput = carouselOutputSchema.safeParse(run.outputPayload);
    if (!parsedOutput.success) {
      throw new ConflictException('Carousel output is not available for export');
    }

    const slides = parsedOutput.data.slides;
    const missingPngs = slides.filter((slide) => !slide.pngFileId);
    if (missingPngs.length > 0) {
      throw new ConflictException(
        'Some slides are missing rendered PNG files. Re-run the carousel to finish rendering.',
      );
    }

    const zip = new JSZip();

    for (const slide of slides) {
      const file = await this.prisma.workspaceFile.findFirst({
        where: {
          id: slide.pngFileId,
          ...scope,
        },
        select: { storageKey: true, name: true },
      });

      if (!file) {
        throw new ConflictException(`Rendered file not found for slide ${slide.id}`);
      }

      const buffer = await this.storage.getObjectBuffer(file.storageKey);
      const fileName = `carousel-slide-${String(slide.order).padStart(2, '0')}.png`;
      zip.file(fileName, buffer);
    }

    const archive = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="carousel-${runId}.zip"`,
    );
    res.send(archive);
  }
}
