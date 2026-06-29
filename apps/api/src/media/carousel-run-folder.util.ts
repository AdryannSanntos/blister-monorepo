import type { PrismaClient } from '@company-os/db';
import { workspaceAgentFolderSystemKey } from '@company-os/types';
import { resolveAgentFolderId } from '../files/workspace-folders.util';
import {
  buildFileKey,
  buildFolderPlaceholderKey,
  buildFolderPrefix,
  sanitizeStorageSegment,
  type WorkspaceStorageRoot,
} from '../files/workspace-storage.util';
import {
  resolveFolderPathSegments,
  uniqueWorkspaceFileName,
  uniqueWorkspaceFolderName,
} from './cut-run-folder.util';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

type StorageMirror = {
  putEmptyObject: (key: string) => Promise<void>;
};

export const carouselRunFolderSystemKey = (runId: string) => `agent:carousel:run:${runId}`;

export const buildCarouselRunFolderName = (runStartedAt?: Date): string => {
  const dateLabel = (runStartedAt ?? new Date()).toISOString().slice(0, 10);
  return `${dateLabel} — Carrossel`;
};

export const buildCarouselSlideFileName = (slideOrder: number, slideId: string): string => {
  const indexLabel = String(slideOrder).padStart(2, '0');
  const safeId = sanitizeStorageSegment(slideId).slice(0, 40) || `slide-${indexLabel}`;
  return `carousel-slide-${indexLabel}-${safeId}.png`;
};

const ensureCarouselAgentFolder = async (
  prisma: Pick<PrismaClient, 'workspaceFolder'>,
  scope: WorkspaceScope,
): Promise<string> => {
  const existingId = await resolveAgentFolderId(prisma, scope, 'carousel');
  if (existingId) return existingId;

  const folder = await prisma.workspaceFolder.create({
    data: {
      ...scope,
      name: 'Carrossel',
      kind: 'SYSTEM',
      systemKey: workspaceAgentFolderSystemKey('carousel'),
    },
    select: { id: true },
  });

  return folder.id;
};

/**
 * One folder per carousel AgentRun under the Carrossel system folder.
 * Idempotent — safe to call before parallel slide renders.
 */
export const ensureCarouselRunFolder = async (
  prisma: Pick<PrismaClient, 'workspaceFolder'>,
  storage: StorageMirror | null,
  params: {
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    runId: string;
    runStartedAt?: Date;
  },
): Promise<string> => {
  const systemKey = carouselRunFolderSystemKey(params.runId);

  const existing = await prisma.workspaceFolder.findFirst({
    where: { ...params.scope, systemKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const carouselFolderId = await ensureCarouselAgentFolder(prisma, params.scope);
  const desiredName = buildCarouselRunFolderName(params.runStartedAt);
  const name = await uniqueWorkspaceFolderName(
    prisma,
    params.scope,
    carouselFolderId,
    desiredName,
  );

  const folder = await prisma.workspaceFolder.create({
    data: {
      ...params.scope,
      parentId: carouselFolderId,
      name,
      kind: 'USER',
      systemKey,
    },
    select: { id: true },
  });

  if (storage) {
    const segments = await resolveFolderPathSegments(prisma, params.scope, folder.id);
    const prefix = buildFolderPrefix(params.storageRoot, segments);
    try {
      await storage.putEmptyObject(buildFolderPlaceholderKey(prefix));
    } catch {
      /* placeholder is best-effort */
    }
  }

  return folder.id;
};

export const buildCarouselSlideStorageKey = async (
  prisma: Pick<PrismaClient, 'workspaceFolder' | 'workspaceFile'>,
  params: {
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    runFolderId: string;
    slideOrder: number;
    slideId: string;
  },
): Promise<{ storageKey: string; fileName: string }> => {
  const desiredName = buildCarouselSlideFileName(params.slideOrder, params.slideId);
  const fileName = await uniqueWorkspaceFileName(
    prisma,
    params.scope,
    params.runFolderId,
    desiredName,
  );

  const segments = await resolveFolderPathSegments(
    prisma,
    params.scope,
    params.runFolderId,
  );
  const folderPrefix = buildFolderPrefix(params.storageRoot, segments);
  const storageKey = buildFileKey(folderPrefix, fileName);

  return { storageKey, fileName };
};
