import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { task, logger } from '@trigger.dev/sdk';
import { z } from 'zod';
import { PrismaClient } from '@company-os/db';
import { overlayPositionSchema, textStyleSpecSchema } from '@company-os/types';
import { resolveFfmpegPath } from '../src/media/resolve-ffmpeg-path';
import { trimVideoFromStorageKey } from '../src/media/trim-video-from-storage';
import {
  buildCutStorageKey,
  registerCutWorkspaceFile,
} from '../src/media/register-cut-file';
import { StorageService } from '../src/storage/storage.service';
import { ConfigService } from '@nestjs/config';
import type { WorkspaceStorageRoot } from '../src/files/workspace-storage.util';
import {
  createCutsDevTimer,
  errorCutsDev,
  logCutsDev,
} from '../src/agents/cuts/cuts-dev-logger';

const prisma = new PrismaClient();

const clipCaptionSchema = z.object({
  text: z.string(),
  startMs: z.number().nonnegative(),
  endMs: z.number().nonnegative(),
});

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
  // Text overlay (title + caption). Optional with defaults so older payloads
  // (no overlay) keep rendering as a plain trim.
  addTitle: z.boolean().default(false),
  titleText: z.string().default(''),
  titleStyleSpec: textStyleSpecSchema.nullable().default(null),
  titlePosition: overlayPositionSchema.default({ x: 0.5, y: 0.08 }),
  titleDurationSec: z.number().default(5),
  addCaptions: z.boolean().default(false),
  captionStyleSpec: textStyleSpecSchema.nullable().default(null),
  captionPosition: overlayPositionSchema.default({ x: 0.5, y: 0.85 }),
  captions: z.array(clipCaptionSchema).default([]),
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
    logCutsDev('render-clip', 'Skipping cut-rendered callback (no API_BASE_URL)', { runId, cutId });
    return;
  }

  const url = `${apiBaseUrl.replace(/\/$/, '')}/api/internal/agent-runs/cuts/cut-rendered/${runId}`;

  logCutsDev('render-clip', 'Notifying API that cut rendered', {
    runId,
    cutId,
    cutFileId,
    runFolderId,
    url,
  });

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
    errorCutsDev('render-clip', 'cut-rendered callback failed', undefined, {
      runId,
      cutId,
      status: response.status,
      body: text.slice(0, 200),
    });
    throw new Error(`cut-rendered callback failed: ${response.status} ${text}`);
  }

  logCutsDev('render-clip', 'cut-rendered callback succeeded', {
    runId,
    cutId,
    cutFileId,
  });
};

/**
 * Burn the configured title/caption overlay onto a trimmed clip via Remotion.
 * The clip is written to a temp file, rendered, read back, and the temp dir is
 * removed. Returns the original buffer untouched if no overlay is enabled.
 */
const burnTextOverlay = async (
  validated: CutsRenderClipPayload,
  clipBuffer: Buffer,
): Promise<Buffer> => {
  if (!validated.addTitle && !validated.addCaptions) return clipBuffer;

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cut-overlay-'));
  const inputPath = path.join(tmpDir, 'input.mp4');
  const outputPath = path.join(tmpDir, 'output.mp4');

  try {
    await fs.writeFile(inputPath, clipBuffer);

    // Imported lazily so the heavy Remotion/Chromium stack only loads when an
    // overlay is actually requested.
    const { renderTextOverlay } = await import('../src/video/render-text-overlay');

    await renderTextOverlay({
      videoPath: inputPath,
      outputPath,
      durationSec: validated.endSec - validated.startSec,
      width: 1080,
      height: 1920,
      addTitle: validated.addTitle,
      titleText: validated.titleText || validated.title,
      titleStyleSpec: validated.titleStyleSpec,
      titlePosition: validated.titlePosition,
      titleDurationSec: validated.titleDurationSec,
      addCaptions: validated.addCaptions,
      captionStyleSpec: validated.captionStyleSpec,
      captionPosition: validated.captionPosition,
      captions: validated.captions,
    });

    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
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
    const elapsed = createCutsDevTimer();

    logger.info('Rendering cut clip', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutIndex: validated.cutIndex,
      startSec: validated.startSec,
      endSec: validated.endSec,
    });

    logCutsDev('render-clip', 'Render job started', {
      runId: validated.runId,
      cutId: validated.cutId,
      cutIndex: validated.cutIndex,
      title: validated.title,
      startSec: validated.startSec,
      endSec: validated.endSec,
      durationSec: Math.round((validated.endSec - validated.startSec) * 10) / 10,
      sourceStorageKey: validated.sourceStorageKey,
    });

    try {
      const storage = buildStorageService();
      const ffmpegPath = resolveFfmpegPath();

      logCutsDev('render-clip', 'Downloading and trimming source video', {
        runId: validated.runId,
        cutId: validated.cutId,
        ffmpegPath,
      });

      let clipBuffer = await trimVideoFromStorageKey({
        storage,
        sourceStorageKey: validated.sourceStorageKey,
        startSec: validated.startSec,
        endSec: validated.endSec,
        ffmpegPath,
        // Cuts are short-form vertical clips — render 9:16 with a blurred fill.
        aspect: 'vertical',
      });

      logCutsDev('render-clip', 'Video trimmed', {
        runId: validated.runId,
        cutId: validated.cutId,
        sizeBytes: clipBuffer.length,
        elapsedMs: elapsed(),
      });

      if (validated.addTitle || validated.addCaptions) {
        logCutsDev('render-clip', 'Burning text overlay', {
          runId: validated.runId,
          cutId: validated.cutId,
          addTitle: validated.addTitle,
          addCaptions: validated.addCaptions,
          titleAnimation: validated.titleStyleSpec?.animation,
          captionAnimation: validated.captionStyleSpec?.animation,
          captionTokens: validated.captions.length,
        });

        clipBuffer = await burnTextOverlay(validated, clipBuffer);

        logCutsDev('render-clip', 'Overlay burned', {
          runId: validated.runId,
          cutId: validated.cutId,
          sizeBytes: clipBuffer.length,
          elapsedMs: elapsed(),
        });
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

      logCutsDev('render-clip', 'Uploading cut to storage', {
        runId: validated.runId,
        cutId: validated.cutId,
        storageKey,
        fileName,
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

      logCutsDev('render-clip', 'Cut clip rendered and registered', {
        runId: validated.runId,
        cutId: validated.cutId,
        cutFileId,
        storageKey,
        sizeBytes: clipBuffer.length,
        elapsedMs: elapsed(),
      });

      await notifyCutRendered(validated.runId, validated.cutId, cutFileId, validated.runFolderId);

      return {
        cutId: validated.cutId,
        cutFileId,
        storageKey,
        sizeBytes: clipBuffer.length,
      };
    } catch (error) {
      errorCutsDev('render-clip', 'Render job failed', error, {
        runId: validated.runId,
        cutId: validated.cutId,
        cutIndex: validated.cutIndex,
        elapsedMs: elapsed(),
      });
      throw error;
    }
  },
});
