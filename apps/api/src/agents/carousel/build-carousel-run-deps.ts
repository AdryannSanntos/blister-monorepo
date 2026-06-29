import type { PrismaClient } from '@company-os/db';
import type { StorageService } from '../../storage/storage.service';
import {
  buildCarouselSlideStorageKey,
  ensureCarouselRunFolder,
} from '../../media/carousel-run-folder.util';
import {
  resolveRunStartedAt,
  resolveScope,
  resolveStorageRoot,
} from '../cuts/services/cuts-render-helpers';
import type { CarouselRunDeps } from './ports/carousel-run-deps';
import type { CarouselRenderService } from './services/carousel-render.service';
import { CarouselTemplateService } from './services/carousel-template.service';

const PRESIGNED_URL_TIMEOUT_MS = 60_000;

const raceWithTimeout = async <T>(work: Promise<T>, ms: number, message: string): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  try {
    return await Promise.race([work, timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
};

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

const resolveWorkspaceScope = (params: {
  companyId?: string;
  personalSpaceId?: string;
}): WorkspaceScope => {
  if (params.personalSpaceId) return { personalSpaceId: params.personalSpaceId };
  if (params.companyId) return { companyId: params.companyId };
  throw new Error('Workspace scope is required for carousel operations');
};

export const buildCarouselRunDeps = (
  prisma: PrismaClient,
  storage: StorageService,
  templateService: CarouselTemplateService,
  renderService: CarouselRenderService,
): CarouselRunDeps => {
  const resolveFileUrl: CarouselRunDeps['resolveFileUrl'] = async ({
    fileId,
    companyId,
    personalSpaceId,
  }) => {
    const lookups: Array<{ companyId?: string; personalSpaceId?: string }> = [];

    if (companyId) {
      lookups.push({ companyId });
      lookups.push({ personalSpaceId: companyId });
    }
    if (personalSpaceId) {
      lookups.push({ personalSpaceId });
      lookups.push({ companyId: personalSpaceId });
    }

    if (lookups.length === 0) {
      throw new Error('Workspace scope is required for carousel operations');
    }

    let file: { storageKey: string } | null = null;
    for (const where of lookups) {
      file = await prisma.workspaceFile.findFirst({
        where: { id: fileId, ...where },
        select: { storageKey: true },
      });
      if (file) break;
    }

    if (!file) {
      throw new Error('Workspace file not found');
    }

    return raceWithTimeout(
      storage.getPresignedDownloadUrl(file.storageKey),
      PRESIGNED_URL_TIMEOUT_MS,
      'Presigned download URL generation timed out',
    );
  };

  const storeRenderedPng: CarouselRunDeps['storeRenderedPng'] = async ({
    runId,
    slideId,
    slideOrder,
    buffer,
    companyId,
    personalSpaceId,
  }) => {
    const scope = resolveWorkspaceScope({ companyId, personalSpaceId });
    const storageRoot = await resolveStorageRoot(prisma, companyId ?? null, personalSpaceId ?? null);
    const runStartedAt = await resolveRunStartedAt(prisma, runId);
    const runFolderId = await ensureCarouselRunFolder(prisma, storage, {
      scope,
      storageRoot,
      runId,
      runStartedAt,
    });

    const { storageKey, fileName } = await buildCarouselSlideStorageKey(prisma, {
      scope,
      storageRoot,
      runFolderId,
      slideOrder,
      slideId,
    });

    await storage.uploadObject(storageKey, buffer, 'image/png');

    const file = await prisma.workspaceFile.create({
      data: {
        ...scope,
        folderId: runFolderId,
        name: fileName,
        mimeType: 'image/png',
        storageKey,
        sizeBytes: buffer.length,
        status: 'INDEXED',
        extractData: false,
        origin: 'AGENT_RUN',
      },
      select: { id: true },
    });

    return file.id;
  };

  const listOwnedTemplateIds: CarouselRunDeps['listOwnedTemplateIds'] = async ({
    companyId,
    personalSpaceId,
  }) => {
    const builtInIds = templateService.listTemplates().map((template) => template.id);
    const scope = companyId
      ? { companyId }
      : personalSpaceId
        ? { personalSpaceId }
        : null;

    if (!scope) {
      return builtInIds;
    }

    const entitlements = await prisma.workspaceEntitlement.findMany({
      where: scope,
      include: {
        item: {
          select: { type: true, refId: true },
        },
      },
    });

    const entitledTemplateIds = entitlements
      .filter((entry) => entry.item.type === 'TEMPLATE' && entry.item.refId)
      .map((entry) => entry.item.refId as string)
      .filter((templateId) => {
        try {
          templateService.getTemplate(templateId);
          return true;
        } catch {
          return false;
        }
      });

    return [...new Set([...builtInIds, ...entitledTemplateIds])];
  };

  return {
    templateService,
    renderSlideToPng: (params) => renderService.renderSlideToPng(params),
    resolveFileUrl,
    storeRenderedPng,
    listOwnedTemplateIds,
  };
};
