import type { PrismaClient } from '@company-os/db';
import type { WorkspaceStorageRoot } from '../../../files/workspace-storage.util';

export type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

export const resolveScope = (
  companyId: string | null,
  personalSpaceId: string | null,
): WorkspaceScope => {
  if (personalSpaceId) return { personalSpaceId };
  if (companyId) return { companyId };
  throw new Error('Workspace scope is required to render cuts');
};

export const resolveStorageRoot = async (
  prisma: PrismaClient,
  companyId: string | null,
  personalSpaceId: string | null,
): Promise<WorkspaceStorageRoot> => {
  if (companyId) {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { slug: true },
    });
    if (!company) throw new Error('Company not found for cut render');
    return { kind: 'company', slug: company.slug };
  }

  if (personalSpaceId) {
    const space = await prisma.personalSpace.findUnique({
      where: { id: personalSpaceId },
      select: { userId: true },
    });
    if (!space) throw new Error('Personal space not found for cut render');
    return { kind: 'personal', userId: space.userId };
  }

  throw new Error('Workspace scope is required to render cuts');
};

export const resolveRunStartedAt = async (
  prisma: PrismaClient,
  runId: string,
): Promise<Date | undefined> => {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { startedAt: true, createdAt: true },
  });
  return run?.startedAt ?? run?.createdAt;
};
