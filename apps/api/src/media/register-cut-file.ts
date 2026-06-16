import type { PrismaClient } from '../generated/prisma';
import {
  buildCutClipFileName,
  resolveFolderPathSegments,
  uniqueWorkspaceFileName,
} from './cut-run-folder.util';
import {
  buildFileKey,
  buildFolderPrefix,
  type WorkspaceStorageRoot,
} from '../files/workspace-storage.util';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

export type RegisterCutFileParams = {
  scope: WorkspaceScope;
  runFolderId: string;
  cutIndex: number;
  title: string;
  storageKey: string;
  sizeBytes: number;
  mimeType?: string;
};

export const buildCutStorageKey = async (
  prisma: Pick<PrismaClient, 'workspaceFolder' | 'workspaceFile'>,
  params: {
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    runFolderId: string;
    cutIndex: number;
    title: string;
  },
): Promise<{ storageKey: string; fileName: string; folderId: string }> => {
  const desiredName = buildCutClipFileName(params.cutIndex, params.title);
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

  return { storageKey, fileName, folderId: params.runFolderId };
};

export const registerCutWorkspaceFile = async (
  prisma: PrismaClient,
  params: RegisterCutFileParams & { fileName: string },
): Promise<string> => {
  const file = await prisma.workspaceFile.create({
    data: {
      ...params.scope,
      folderId: params.runFolderId,
      name: params.fileName,
      mimeType: params.mimeType ?? 'video/mp4',
      storageKey: params.storageKey,
      sizeBytes: params.sizeBytes,
      status: 'INDEXED',
      extractData: false,
      origin: 'AGENT_RUN',
    },
  });

  return file.id;
};
