import type { PrismaClient } from '../generated/prisma';
import { resolveAgentFolderId } from '../files/workspace-folders.util';
import {
  buildFileKey,
  buildFolderPrefix,
  sanitizeStorageSegment,
  type WorkspaceStorageRoot,
} from '../files/workspace-storage.util';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

export type RegisterCutFileParams = {
  scope: WorkspaceScope;
  storageRoot: WorkspaceStorageRoot;
  runId: string;
  cutId: string;
  title: string;
  storageKey: string;
  sizeBytes: number;
  mimeType?: string;
};

const buildCutFileName = (runId: string, cutId: string, title: string): string => {
  const safeTitle = sanitizeStorageSegment(title).slice(0, 48) || cutId;
  const shortRun = runId.slice(-8);
  return `${safeTitle} — ${cutId} (${shortRun}).mp4`;
};

export const buildCutStorageKey = async (
  prisma: Pick<PrismaClient, 'workspaceFolder'>,
  params: {
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    runId: string;
    cutId: string;
    title: string;
  },
): Promise<{ storageKey: string; fileName: string; folderId: string }> => {
  const folderId = await resolveAgentFolderId(prisma, params.scope, 'cuts');
  if (!folderId) {
    throw new Error('Cuts workspace folder is not available');
  }

  const folder = await prisma.workspaceFolder.findFirst({
    where: { id: folderId, ...params.scope },
    select: { name: true, parentId: true },
  });
  if (!folder) {
    throw new Error('Cuts workspace folder not found');
  }

  const segments: string[] = [folder.name];
  let currentParentId = folder.parentId;
  while (currentParentId) {
    const parent = await prisma.workspaceFolder.findFirst({
      where: { id: currentParentId, ...params.scope },
      select: { name: true, parentId: true },
    });
    if (!parent) break;
    segments.unshift(parent.name);
    currentParentId = parent.parentId;
  }

  const folderPrefix = buildFolderPrefix(params.storageRoot, segments);
  const fileName = buildCutFileName(params.runId, params.cutId, params.title);
  const storageKey = buildFileKey(folderPrefix, fileName);

  return { storageKey, fileName, folderId };
};

export const registerCutWorkspaceFile = async (
  prisma: PrismaClient,
  params: RegisterCutFileParams,
): Promise<string> => {
  const folderId = await resolveAgentFolderId(prisma, params.scope, 'cuts');
  if (!folderId) {
    throw new Error('Cuts workspace folder is not available');
  }

  const fileName = buildCutFileName(params.runId, params.cutId, params.title);

  const file = await prisma.workspaceFile.create({
    data: {
      ...params.scope,
      folderId,
      name: fileName,
      mimeType: params.mimeType ?? 'video/mp4',
      storageKey: params.storageKey,
      sizeBytes: params.sizeBytes,
      status: 'INDEXED',
      extractData: false,
      origin: 'UPLOAD',
    },
  });

  return file.id;
};
