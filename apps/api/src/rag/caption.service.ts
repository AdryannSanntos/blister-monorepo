import { Injectable, Logger } from '@nestjs/common';
import type { CampaignFile } from '../generated/prisma';
import { generatePlatformCaptionFromSettings } from '../ai-runtime/platform-ai.client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CaptionService {
  private readonly logger = new Logger(CaptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async enrichCampaignFile(file: CampaignFile): Promise<CampaignFile> {
    if (file.extractedText?.trim() || file.caption?.trim()) {
      return file;
    }

    try {
      const imageBase64 =
        file.type === 'IMAGE' && file.mimeType.startsWith('image/')
          ? (await this.storage.getObjectBuffer(file.storageKey)).toString('base64')
          : undefined;

      const caption = await generatePlatformCaptionFromSettings(this.prisma, {
        fileName: file.name,
        mimeType: file.mimeType,
        imageBase64,
      });

      if (!caption) {
        return file;
      }

      return this.prisma.campaignFile.update({
        where: { id: file.id },
        data: { caption },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to generate caption for campaign file ${file.id}`,
        error,
      );
      return file;
    }
  }

  async enrichCampaignFiles(files: CampaignFile[]): Promise<CampaignFile[]> {
    const enriched: CampaignFile[] = [];

    for (const file of files) {
      enriched.push(await this.enrichCampaignFile(file));
    }

    return enriched;
  }
}
