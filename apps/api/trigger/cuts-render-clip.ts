import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { task, logger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma';
import { resolveFfmpegPath } from '../src/media/resolve-ffmpeg-path';
import { trimVideoToBuffer } from '../src/media/trim-video';
import {
  buildCutStorageKey,
  registerCutWorkspaceFile,
} from '../src/media/register-cut-file';
import { StorageService } from '../src/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceStorageRoot } from '../src/files/workspace-storage.util';

const prisma = new PrismaClient();

const payloadSchema = z.object({
  runId: z.string().min(1),
  runFolderId: z.string().min(1),
  cutId: z.string().min(1),
  cutIndex: z.number().int().positive(),
  title: z.string().min(1),
  sourceStorageKey: z.string().min(1),
  startSec: z.number().nonnegative(),
  endSec: z.number().positive(),
  companyId: z.string().nullable(),
  personalSpaceId: z.string().nullable(),
});

export type CutsRenderClipPayload = z.infer<typeof payloadSchema>;

export type CutsRenderClipResult = {
  cutId: string;
  cutFileId: string;
  storageKey: string;
  sizeBytes: number;
};

const resolveStorageRoot = async (
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

  throw new Error('Workspace scope is required to render a cut');
};

const buildStorageService = (): StorageService => {
  const config = new ConfigService();
  return new StorageService(config);
};

export const cutsRenderClip = task({
  id: 'cuts-render-clip',
  machine: { preset: 'medium-1x' },
  maxDuration: 600,
  retry: {
    maxAttempts: 2,
    factor: 2,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 30000,
  },
  run: async (payload: CutsRenderClipPayload): Promise<CutsRenderClipResult> => {
    const validated = payloadSchema.parse(payload);
    logger.info('Rendering cut clip', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutIndex: validated.cutIndex,
      startSec: validated.startSec,
      endSec: validated.endSec,
    });

    const storage = buildStorageService();
    const ffmpegPath = resolveFfmpegPath();
    logger.info('Resolved FFmpeg binary', {
      ffmpegPath,
      ffmpegPathEnv: process.env.FFMPEG_PATH ?? null,
      triggerRunId: process.env.TRIGGER_RUN_ID ?? null,
    });

    const sourceWorkDir = join(tmpdir(), `blister-cut-source-${randomUUID()}`);
    const sourcePath = join(sourceWorkDir, 'source.mp4');
    await mkdir(sourceWorkDir, { recursive: true });

    let clipBuffer: Buffer;
    try {
      logger.info('Downloading source video for trim', {
        sourceStorageKey: validated.sourceStorageKey,
      });
      await storage.downloadObjectToPath(validated.sourceStorageKey, sourcePath);

      clipBuffer = await trimVideoToBuffer({
        inputPath: sourcePath,
        startSec: validated.startSec,
        endSec: validated.endSec,
        ffmpegPath,
      });
    } finally {
      await rm(sourceWorkDir, { recursive: true, force: true }).catch(() => undefined);
    }

    const scope =
      validated.companyId !== null
        ? { companyId: validated.companyId }
        : { personalSpaceId: validated.personalSpaceId! };

    const storageRoot = await resolveStorageRoot(
      validated.companyId,
      validated.personalSpaceId,
    );

    const { storageKey, fileName } = await buildCutStorageKey(prisma, {
      scope,
      storageRoot,
      runFolderId: validated.runFolderId,
      cutIndex: validated.cutIndex,
      title: validated.title,
    });

    await storage.uploadObject(storageKey, clipBuffer, 'video/mp4');

    const cutFileId = await registerCutWorkspaceFile(prisma, {
      scope,
      runFolderId: validated.runFolderId,
      cutIndex: validated.cutIndex,
      title: validated.title,
      fileName,
      storageKey,
      sizeBytes: clipBuffer.length,
    });

    logger.info('Cut clip rendered', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutFileId,
      sizeBytes: clipBuffer.length,
    });

    return {
      cutId: validated.cutId,
      cutFileId,
      storageKey,
      sizeBytes: clipBuffer.length,
    };
  },
});
