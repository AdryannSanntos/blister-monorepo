import type { CampaignFile, PrismaClient } from "../src/generated/prisma";
import { generatePlatformCaptionFromSettings } from "../src/ai-runtime/platform-ai.client";
import { getObjectBufferFromEnv } from "../src/storage/object-storage.util";

export const enrichCampaignFilesForRag = async (
  prisma: PrismaClient,
  files: CampaignFile[],
): Promise<CampaignFile[]> => {
  const enriched: CampaignFile[] = [];

  for (const file of files) {
    enriched.push(await enrichCampaignFileForRag(prisma, file));
  }

  return enriched;
};

const enrichCampaignFileForRag = async (
  prisma: PrismaClient,
  file: CampaignFile,
): Promise<CampaignFile> => {
  if (file.extractedText?.trim() || file.caption?.trim()) {
    return file;
  }

  try {
    const imageBase64 =
      file.type === "IMAGE" && file.mimeType.startsWith("image/")
        ? (await getObjectBufferFromEnv(file.storageKey)).toString("base64")
        : undefined;

    const caption = await generatePlatformCaptionFromSettings(prisma, {
      fileName: file.name,
      mimeType: file.mimeType,
      imageBase64,
    });

    if (!caption) {
      return file;
    }

    return prisma.campaignFile.update({
      where: { id: file.id },
      data: { caption },
    });
  } catch {
    return file;
  }
};
