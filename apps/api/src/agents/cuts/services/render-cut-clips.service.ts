import type { CutOutput } from '@company-os/types';
import { Logger } from '@nestjs/common';
import type { PrismaClient } from '../../../generated/prisma';
import { readAgentExecutionMode } from '../../runtime/agent-execution-mode';
import { ensureCutRunFolder } from '../../../media/cut-run-folder.util';
import {
  buildCutStorageKey,
  registerCutWorkspaceFile,
} from '../../../media/register-cut-file';
import { trimVideoToBuffer } from '../../../media/trim-video';
import type { StorageService } from '../../../storage/storage.service';
import type { WorkspaceStorageRoot } from '../../../files/workspace-storage.util';
import type { RenderCutClipsParams, RenderCutClipsResult } from '../ports/cuts-run-deps';

type WorkspaceScope =
  | { personalSpaceId: string; companyId?: never }
  | { companyId: string; personalSpaceId?: never };

const logger = new Logger('RenderCutClipsService');

const shouldAttemptTriggerRender = (): boolean => {
  const mode = readAgentExecutionMode();
  if (mode !== 'trigger') return false;
  return Boolean(process.env.TRIGGER_SECRET_KEY && process.env.TRIGGER_PROJECT_ID);
};

const resolveStorageRoot = async (
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

const resolveScope = (
  companyId: string | null,
  personalSpaceId: string | null,
): WorkspaceScope => {
  if (personalSpaceId) return { personalSpaceId };
  if (companyId) return { companyId };
  throw new Error('Workspace scope is required to render cuts');
};

const resolveRunStartedAt = async (
  prisma: PrismaClient,
  runId: string,
): Promise<Date | undefined> => {
  const run = await prisma.agentRun.findUnique({
    where: { id: runId },
    select: { startedAt: true, createdAt: true },
  });
  return run?.startedAt ?? run?.createdAt;
};

const renderClipInline = async (
  prisma: PrismaClient,
  storage: StorageService,
  params: {
    runFolderId: string;
    cutIndex: number;
    cut: CutOutput;
    sourceStorageKey: string;
    scope: WorkspaceScope;
    storageRoot: WorkspaceStorageRoot;
    uploadToStorage: boolean;
  },
): Promise<CutOutput> => {
  const { storageKey, fileName } = await buildCutStorageKey(prisma, {
    scope: params.scope,
    storageRoot: params.storageRoot,
    runFolderId: params.runFolderId,
    cutIndex: params.cutIndex,
    title: params.cut.title,
  });

  let sizeBytes = 1024;

  if (params.uploadToStorage) {
    const sourceUrl = await storage.getPresignedDownloadUrl(params.sourceStorageKey);
    const clipBuffer = await trimVideoToBuffer({
      inputUrl: sourceUrl,
      startSec: params.cut.startSec,
      endSec: params.cut.endSec,
    });
    await storage.uploadObject(storageKey, clipBuffer, 'video/mp4');
    sizeBytes = clipBuffer.length;
  }

  const cutFileId = await registerCutWorkspaceFile(prisma, {
    scope: params.scope,
    runFolderId: params.runFolderId,
    cutIndex: params.cutIndex,
    title: params.cut.title,
    fileName,
    storageKey,
    sizeBytes,
  });

  return { ...params.cut, cutFileId };
};

const renderViaTriggerTasks = async (
  params: RenderCutClipsParams,
  sourceStorageKey: string,
  runFolderId: string,
): Promise<CutOutput[]> => {
  const { cutsRenderClip } = await import('../../../../trigger/cuts-render-clip');

  const payloads = params.cuts.map((cut, index) => ({
    payload: {
      runId: params.runId,
      runFolderId,
      cutId: cut.id,
      cutIndex: index + 1,
      title: cut.title,
      sourceStorageKey,
      startSec: cut.startSec,
      endSec: cut.endSec,
      companyId: params.sourceFile.companyId,
      personalSpaceId: params.personalSpaceId ?? params.sourceFile.personalSpaceId,
    },
  }));

  const batchResult = await cutsRenderClip.batchTriggerAndWait(payloads);
  const renderedByCutId = new Map<string, string>();

  for (const run of batchResult.runs) {
    if (!run.ok) {
      const message =
        run.error instanceof Error
          ? run.error.message
          : typeof run.error === 'string'
            ? run.error
            : 'Cut render task failed';
      throw new Error(message);
    }
    renderedByCutId.set(run.output.cutId, run.output.cutFileId);
  }

  return params.cuts.map((cut) => {
    const cutFileId = renderedByCutId.get(cut.id);
    if (!cutFileId) {
      throw new Error(`Missing rendered file for cut ${cut.id}`);
    }
    return { ...cut, cutFileId };
  });
};

export const renderCutClipsWithDeps = async (
  prisma: PrismaClient,
  storage: StorageService,
  params: RenderCutClipsParams,
): Promise<RenderCutClipsResult> => {
  const scope = resolveScope(
    params.sourceFile.companyId,
    params.personalSpaceId ?? params.sourceFile.personalSpaceId,
  );
  const storageRoot = await resolveStorageRoot(
    prisma,
    params.sourceFile.companyId,
    params.personalSpaceId ?? params.sourceFile.personalSpaceId,
  );
  const runStartedAt = await resolveRunStartedAt(prisma, params.runId);
  const runFolderId = await ensureCutRunFolder(prisma, storage, {
    scope,
    storageRoot,
    runId: params.runId,
    sourceFileName: params.sourceFile.name,
    runStartedAt,
  });

  const mode = readAgentExecutionMode();
  let renderedCuts: CutOutput[];

  if (mode === 'inline-stub') {
    renderedCuts = await Promise.all(
      params.cuts.map((cut, index) =>
        renderClipInline(prisma, storage, {
          runFolderId,
          cutIndex: index + 1,
          cut,
          sourceStorageKey: params.sourceFile.storageKey,
          scope,
          storageRoot,
          uploadToStorage: false,
        }),
      ),
    );
  } else if (shouldAttemptTriggerRender()) {
    try {
      renderedCuts = await renderViaTriggerTasks(
        params,
        params.sourceFile.storageKey,
        runFolderId,
      );
    } catch (error) {
      logger.warn(
        `Trigger render failed, falling back to inline FFmpeg: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      renderedCuts = await Promise.all(
        params.cuts.map((cut, index) =>
          renderClipInline(prisma, storage, {
            runFolderId,
            cutIndex: index + 1,
            cut,
            sourceStorageKey: params.sourceFile.storageKey,
            scope,
            storageRoot,
            uploadToStorage: true,
          }),
        ),
      );
    }
  } else {
    renderedCuts = await Promise.all(
      params.cuts.map((cut, index) =>
        renderClipInline(prisma, storage, {
          runFolderId,
          cutIndex: index + 1,
          cut,
          sourceStorageKey: params.sourceFile.storageKey,
          scope,
          storageRoot,
          uploadToStorage: true,
        }),
      ),
    );
  }

  return {
    cuts: renderedCuts,
    sourceFileId: params.sourceFile.id,
  };
};
