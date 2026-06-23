import type { CampaignFile, PrismaClient } from '@company-os/db';
import { ConfigService } from '@nestjs/config';
import { createAgentIaSdk, type AgentIaSdk } from '@company-os/agent-ia-sdk';
import { loadProviderSecrets } from '../src/integrations/agent-ia-sdk/load-provider-secrets';
import { getObjectBufferFromEnv } from '../src/storage/object-storage.util';

const buildSdk = (prisma: PrismaClient): AgentIaSdk =>
  createAgentIaSdk({ prisma, secrets: loadProviderSecrets(new ConfigService()) });

export const enrichCampaignFilesForRag = async (
  prisma: PrismaClient,
  files: CampaignFile[],
): Promise<CampaignFile[]> => {
  const sdk = buildSdk(prisma);
  const enriched: CampaignFile[] = [];

  for (const file of files) {
    enriched.push(await enrichCampaignFileForRag(prisma, sdk, file));
  }

  return enriched;
};

const enrichCampaignFileForRag = async (
  prisma: PrismaClient,
  sdk: AgentIaSdk,
  file: CampaignFile,
): Promise<CampaignFile> => {
  if (file.extractedText?.trim() || file.caption?.trim()) {
    return file;
  }

  try {
    const imageBase64 =
      file.type === 'IMAGE' && file.mimeType.startsWith('image/')
        ? (await getObjectBufferFromEnv(file.storageKey)).toString('base64')
        : undefined;

    const caption = await sdk.ia.rag.caption({
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
