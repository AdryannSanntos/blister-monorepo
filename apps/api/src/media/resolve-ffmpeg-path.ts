import { accessSync, constants } from 'node:fs';

let cachedBundledPath: string | null | undefined;

const loadBundledFfmpegPath = (): string | null => {
  if (cachedBundledPath !== undefined) {
    return cachedBundledPath;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpegStatic = require('ffmpeg-static') as string | null | undefined;
    if (typeof ffmpegStatic === 'string' && ffmpegStatic.length > 0) {
      accessSync(ffmpegStatic, constants.X_OK);
      cachedBundledPath = ffmpegStatic;
      return cachedBundledPath;
    }
  } catch {
    /* bundled binary unavailable in this environment */
  }

  cachedBundledPath = null;
  return cachedBundledPath;
};

/** Path installed by @trigger.dev/build/extensions/core ffmpeg() in cloud workers. */
const TRIGGER_FFMPEG_PATH = '/usr/bin/ffmpeg';

const isTriggerWorker = (): boolean =>
  Boolean(process.env.TRIGGER_RUN_ID ?? process.env.TRIGGER_ATTEMPT_ID);

const tryExecutablePath = (candidate: string): string | null => {
  try {
    accessSync(candidate, constants.X_OK);
    return candidate;
  } catch {
    return null;
  }
};

/**
 * Resolves the FFmpeg binary:
 * 1. FFMPEG_PATH / FFMPEG_BINARY env override
 * 2. /usr/bin/ffmpeg in Trigger cloud (build extension)
 * 3. ffmpeg-static (local API + local Trigger dev worker)
 * 4. `ffmpeg` on PATH
 */
export const resolveFfmpegPath = (): string => {
  const fromEnv = process.env.FFMPEG_PATH ?? process.env.FFMPEG_BINARY;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  if (isTriggerWorker()) {
    const triggerPath = tryExecutablePath(TRIGGER_FFMPEG_PATH);
    if (triggerPath) {
      return triggerPath;
    }
  }

  const bundled = loadBundledFfmpegPath();
  if (bundled) {
    return bundled;
  }

  return 'ffmpeg';
};

/** @internal Test helper — reset cached bundled path between tests. */
export const resetFfmpegPathCacheForTests = (): void => {
  cachedBundledPath = undefined;
};
