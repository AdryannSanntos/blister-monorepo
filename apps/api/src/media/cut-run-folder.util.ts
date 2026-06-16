import type { PrismaClient } from '../generated/prisma';
import { resolveAgentFolderId } from '../files/workspace-folders.util';
import {
  buildFolderPlaceholderKey,
  buildFolderPrefix,
  sanitizeStorageSegment,
  splitFileName,
  withCollisionSuffix,
  type WorkspaceStorageRoot,
} from '../files/workspace-storage.util';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

type StorageMirror = {
  putEmptyObject: (key: string) => Promise<void>;
};

export const cutsRunFolderSystemKey = (runId: string) => `agent:cuts:run:${runId}`;

export const stripFileExtension = (fileName: string): string => {
  const { base } = splitFileName(fileName);
  return base.length > 0 ? base : fileName;
};

/** ISO date prefix so run folders sort chronologically in Files and S3. */
export const formatCutRunFolderDate = (date: Date): string =>
  date.toISOString().slice(0, 10);

export const buildCutRunFolderName = (
  sourceFileName: string,
  runStartedAt?: Date,
): string => {
  const dateLabel = formatCutRunFolderDate(runStartedAt ?? new Date());
  const sourceLabel =
    sanitizeStorageSegment(stripFileExtension(sourceFileName)).slice(0, 64) ||
    'Video';
  return `${dateLabel} — ${sourceLabel}`;
};

export const buildCutClipFileName = (cutIndex: number, title: string): string => {
  const indexLabel = String(cutIndex).padStart(2, '0');
  const safeTitle =
    sanitizeStorageSegment(title).slice(0, 80) || `Cut ${indexLabel}`;
  return `${indexLabel} — ${safeTitle}.mp4`;
};

export const resolveFolderPathSegments = async (
  db: Pick<PrismaClient, 'workspaceFolder'>,
  scope: WorkspaceScope,
  folderId: string,
): Promise<string[]> => {
  const segments: string[] = [];
  let currentId: string | null = folderId;

  while (currentId) {
    const folder: { name: string; parentId: string | null } | null =
      await db.workspaceFolder.findFirst({
        where: { id: currentId, ...scope },
        select: { name: true, parentId: true },
      });
    if (!folder) break;
    segments.unshift(folder.name);
    currentId = folder.parentId;
  }

  return segments;
};

const segmentKey = (value: string) =>
  sanitizeStorageSegment(value).toLowerCase();

export const uniqueWorkspaceFileName = async (
  db: Pick<PrismaClient, 'workspaceFile'>,
  scope: WorkspaceScope,
  folderId: string,
  desired: string,
  excludeFileId?: string,
): Promise<string> => {
  const siblings = await db.workspaceFile.findMany({
    where: {
      folderId,
      ...scope,
      ...(excludeFileId ? { id: { not: excludeFileId } } : {}),
    },
    select: { name: true },
  });

  const taken = new Set(siblings.map((file) => segmentKey(file.name)));
  if (!taken.has(segmentKey(desired))) return desired;

  for (let counter = 1; counter < 1000; counter++) {
    const candidate = withCollisionSuffix(desired, counter);
    if (!taken.has(segmentKey(candidate))) return candidate;
  }

  return withCollisionSuffix(desired, Date.now());
};

export const uniqueWorkspaceFolderName = async (
  db: Pick<PrismaClient, 'workspaceFolder'>,
  scope: WorkspaceScope,
  parentId: string,
  desired: string,
  excludeFolderId?: string,
): Promise<string> => {
  const siblings = await db.workspaceFolder.findMany({
    where: {
      parentId,
      ...scope,
      ...(excludeFolderId ? { id: { not: excludeFolderId } } : {}),
    },
    select: { name: true },
  });

  const taken = new Set(siblings.map((folder) => segmentKey(folder.name)));
  if (!taken.has(segmentKey(desired))) return desired;

  for (let counter = 1; counter < 1000; counter++) {
    const candidate = `${desired} (${counter})`;
    if (!taken.has(segmentKey(candidate))) return candidate;
  }

  return `${desired} (${Date.now()})`;
};

/**
 * One folder per cuts AgentRun under the Cortes system folder.
 * Idempotent — safe to call before parallel clip renders.
 */
export const ensureCutRunFolder = async (
  prisma: Pick<PrismaClient, 'workspaceFolder'>,
  storage: StorageMirror | null,
  params: {
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    runId: string;
    sourceFileName: string;
    runStartedAt?: Date;
  },
): Promise<string> => {
  const systemKey = cutsRunFolderSystemKey(params.runId);

  const existing = await prisma.workspaceFolder.findFirst({
    where: { ...params.scope, systemKey },
    select: { id: true },
  });
  if (existing) return existing.id;

  const cutsFolderId = await resolveAgentFolderId(prisma, params.scope, 'cuts');
  if (!cutsFolderId) {
    throw new Error('Cuts workspace folder is not available');
  }

  const desiredName = buildCutRunFolderName(
    params.sourceFileName,
    params.runStartedAt,
  );
  const name = await uniqueWorkspaceFolderName(
    prisma,
    params.scope,
    cutsFolderId,
    desiredName,
  );

  const folder = await prisma.workspaceFolder.create({
    data: {
      ...params.scope,
      parentId: cutsFolderId,
      name,
      kind: 'USER',
      systemKey,
    },
    select: { id: true },
  });

  if (storage) {
    const segments = await resolveFolderPathSegments(
      prisma,
      params.scope,
      folder.id,
    );
    const prefix = buildFolderPrefix(params.storageRoot, segments);
    try {
      await storage.putEmptyObject(buildFolderPlaceholderKey(prefix));
    } catch {
      /* placeholder is best-effort */
    }
  }

  return folder.id;
};
