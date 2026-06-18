import { task, logger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma';
import { resolveFfmpegPath } from '../src/media/resolve-ffmpeg-path';
import { trimVideoFromStorageKey } from '../src/media/trim-video-from-storage';
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
  endSec: z.number().nonnegative().refine((v) => v > 0, 'endSec must be positive'),
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

const buildStorageService = (): StorageService => new StorageService(new ConfigService());

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

const notifyCutRendered = async (
  runId: string,
  cutId: string,
  cutFileId: string,
  runFolderId: string,
): Promise<void> => {
  const apiBaseUrl = process.env.API_BASE_URL;
  const internalSecret = process.env.INTERNAL_SECRET ?? process.env.TRIGGER_SECRET_KEY ?? '';

  if (!apiBaseUrl) {
    logger.warn('API_BASE_URL not set — skipping cut-rendered callback');
    return;
  }

  const url = `${apiBaseUrl}/internal/agent-runs/cuts/cut-rendered/${runId}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-internal-secret': internalSecret,
    },
    body: JSON.stringify({ cutId, cutFileId, runFolderId }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`cut-rendered callback failed: ${response.status} ${text}`);
  }
};

export const cutsRenderClip = task({
  id: 'cuts-render-clip',
  machine: { preset: 'medium-1x' },
  queue: { concurrencyLimit: 2 },
  maxDuration: 1800,
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

    logger.info('Downloading source video', { sourceStorageKey: validated.sourceStorageKey });

    const clipBuffer = await trimVideoFromStorageKey({
      storage,
      sourceStorageKey: validated.sourceStorageKey,
      startSec: validated.startSec,
      endSec: validated.endSec,
      ffmpegPath,
    });

    logger.info('Cut clip trimmed', {
      cutId: validated.cutId,
      sizeBytes: clipBuffer.length,
    });

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

    await notifyCutRendered(validated.runId, validated.cutId, cutFileId, validated.runFolderId);

    return {
      cutId: validated.cutId,
      cutFileId,
      storageKey,
      sizeBytes: clipBuffer.length,
    };
  },
});
