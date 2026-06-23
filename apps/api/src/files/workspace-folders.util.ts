import {
  WORKSPACE_AGENT_FOLDERS,
  workspaceAgentFolderSystemKey,
} from '@company-os/types';
import type { PrismaClient } from '@company-os/db';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

export async function ensureWorkspaceAgentFolders(
  db: Pick<PrismaClient, 'workspaceFolder'>,
  scope: WorkspaceScope,
) {
  for (const folder of WORKSPACE_AGENT_FOLDERS) {
    const existing = await db.workspaceFolder.findFirst({
      where: {
        ...scope,
        systemKey: folder.systemKey,
      },
    });

    if (existing) continue;

    await db.workspaceFolder.create({
      data: {
        ...scope,
        name: folder.name,
        kind: 'SYSTEM',
        systemKey: folder.systemKey,
      },
    });
  }
}

export async function resolveAgentFolderId(
  db: Pick<PrismaClient, 'workspaceFolder'>,
  scope: WorkspaceScope,
  agentId: string,
) {
  await ensureWorkspaceAgentFolders(db, scope);

  const folder = await db.workspaceFolder.findFirst({
    where: {
      ...scope,
      systemKey: workspaceAgentFolderSystemKey(agentId),
    },
  });

  return folder?.id ?? null;
}

export async function resetWorkspaceFoldersAndFiles(
  db: Pick<
    PrismaClient,
    'workspaceFile' | 'workspaceFolder' | 'personalSpace' | 'company'
  >,
) {
  await db.workspaceFile.deleteMany({});
  await db.workspaceFolder.deleteMany({});

  const personalSpaces = await db.personalSpace.findMany({ select: { id: true } });
  for (const space of personalSpaces) {
    await ensureWorkspaceAgentFolders(db, { personalSpaceId: space.id });
  }

  const companies = await db.company.findMany({ select: { id: true } });
  for (const company of companies) {
    await ensureWorkspaceAgentFolders(db, { companyId: company.id });
  }
}
