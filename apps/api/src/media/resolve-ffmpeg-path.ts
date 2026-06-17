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

const isTriggerWorker = (): boolean =>
  Boolean(process.env.TRIGGER_RUN_ID ?? process.env.TRIGGER_ATTEMPT_ID);

/** Resolves the FFmpeg binary — env override, then ffmpeg-static, then PATH. */
export const resolveFfmpegPath = (): string => {
  const fromEnv = process.env.FFMPEG_PATH ?? process.env.FFMPEG_BINARY;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  // ffmpeg-static paths baked into the Trigger bundle often point at a missing
  // or wrong-arch binary; the ffmpeg build extension installs /usr/bin/ffmpeg.
  if (!isTriggerWorker()) {
    const bundled = loadBundledFfmpegPath();
    if (bundled) {
      return bundled;
    }
  }

  return 'ffmpeg';
};

/** @internal Test helper — reset cached bundled path between tests. */
export const resetFfmpegPathCacheForTests = (): void => {
  cachedBundledPath = undefined;
};
