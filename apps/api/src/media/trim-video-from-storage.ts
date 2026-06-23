import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { StorageService } from '../storage/storage.service';
import { type TrimVideoAspect, trimVideoToBuffer } from './trim-video';

export type TrimVideoFromStorageParams = {
  storage: StorageService;
  sourceStorageKey: string;
  startSec: number;
  endSec: number;
  ffmpegPath?: string;
  aspect?: TrimVideoAspect;
  timeoutMs?: number;
};

/**
 * Downloads the source object via the S3 SDK, then trims locally.
 * More reliable than FFmpeg over presigned HTTP URLs (which can hang or time out).
 */
export const trimVideoFromStorageKey = async (
  params: TrimVideoFromStorageParams,
): Promise<Buffer> => {
  const workDir = join(tmpdir(), `blister-cut-src-${randomUUID()}`);
  const sourcePath = join(workDir, 'source');

  await mkdir(workDir, { recursive: true });

  try {
    await params.storage.downloadObjectToPath(params.sourceStorageKey, sourcePath);

    return await trimVideoToBuffer({
      inputPath: sourcePath,
      startSec: params.startSec,
      endSec: params.endSec,
      ffmpegPath: params.ffmpegPath,
      aspect: params.aspect,
      timeoutMs: params.timeoutMs,
    });
  } finally {
    await rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
};
