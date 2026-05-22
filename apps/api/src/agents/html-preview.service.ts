import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

const toJsonValue = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;

@Injectable()
export class HtmlPreviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
  ) {}

  async prepareHtmlValidation(runId: string, html: string) {
    const run = await this.prisma.agentRun.findUnique({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    const previewState = {
      status: 'awaiting_user_validation',
      html,
      preview: {
        mimeType: 'text/html',
        confirmed: false,
      },
    } as const;

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'awaiting_user_validation',
        outputPayload: toJsonValue(previewState),
      },
    });

    return previewState;
  }

  async confirmHtmlExport(runId: string, pngBuffer: Buffer | Uint8Array) {
    const run = await this.prisma.agentRun.findUnique({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException('Agent run not found');
    }

    if (run.status !== 'awaiting_user_validation') {
      throw new BadRequestException('Run is not awaiting html validation');
    }

    const objectKey = this.storageService.buildAgentRunArtifactKey(
      run.organizationId,
      run.id,
      'preview.png',
    );
    await this.storageService.putObject({
      key: objectKey,
      body: pngBuffer,
      contentType: 'image/png',
    });

    const publicUrl = this.storageService.buildPublicObjectUrl(objectKey);
    const currentOutput =
      run.outputPayload && typeof run.outputPayload === 'object' ? run.outputPayload : {};
    const nextOutput = {
      ...currentOutput,
      status: 'validated',
      preview: {
        mimeType: 'image/png',
        confirmed: true,
        key: objectKey,
        publicUrl,
      },
      files: [{ key: objectKey, mimeType: 'image/png', publicUrl }],
    };

    await this.prisma.agentRun.update({
      where: { id: runId },
      data: {
        status: 'success',
        outputPayload: toJsonValue(nextOutput),
        completedAt: new Date(),
      },
    });

    return nextOutput;
  }
}
