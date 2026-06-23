import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

import { compositionIdForAnimation } from './text-style.registry';
import { resolveRemotionEntryPoint } from './resolve-remotion-entry-point';
import { serveLocalMediaDirectory } from './serve-local-media';
import type { OverlayCaption, OverlayPoint, TextOverlayProps } from './compositions/types';
import type { TextStyleSpec } from '@company-os/types';

export type RenderTextOverlayStage =
  | 'resolve_bundle'
  | 'bundle'
  | 'serve_media'
  | 'select_composition'
  | 'render_media';

/** First Remotion webpack bundle on a cold worker can take several minutes. */
const REMOTION_BUNDLE_TIMEOUT_MS = 15 * 60 * 1000;
/** Headless render for a short vertical clip; fail instead of hanging forever. */
const REMOTION_RENDER_TIMEOUT_MS = 5 * 60 * 1000;

export interface RenderTextOverlayConfig {
  /** Absolute path to the trimmed input clip (FFmpeg output). */
  videoPath: string;
  /** Absolute path where the overlaid clip is written. */
  outputPath: string;
  durationSec: number;
  width: number;
  height: number;

  addTitle: boolean;
  titleText: string;
  titleStyleSpec: TextStyleSpec | null;
  titlePosition: OverlayPoint;
  titleDurationSec: number;

  addCaptions: boolean;
  captionStyleSpec: TextStyleSpec | null;
  captionPosition: OverlayPoint;
  captions: OverlayCaption[];

  /** Optional milestone callback (e.g. Trigger logger.info). */
  onStage?: (stage: RenderTextOverlayStage, detail?: Record<string, unknown>) => void;
}

let cachedServeUrl: string | null = null;

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

/**
 * Bundle the Remotion entry once per worker process. The bundler compiles the
 * `.tsx` compositions with its own toolchain (independent of the Nest build).
 */
async function getServeUrl(
  onStage?: RenderTextOverlayConfig['onStage'],
): Promise<string> {
  const fromEnv = process.env.REMOTION_SERVE_URL?.trim();
  if (fromEnv) {
    onStage?.('resolve_bundle', { source: 'env', serveUrl: fromEnv });
    return fromEnv;
  }

  if (cachedServeUrl) {
    onStage?.('resolve_bundle', { source: 'cache', serveUrl: cachedServeUrl });
    return cachedServeUrl;
  }

  onStage?.('bundle', { status: 'started' });
  const entryPoint = await resolveRemotionEntryPoint();
  const serveUrl = await withTimeout(
    bundle({
      entryPoint,
      onProgress: (progress) => {
        onStage?.('bundle', { progressPct: Math.round(progress * 100) });
      },
    }),
    REMOTION_BUNDLE_TIMEOUT_MS,
    'Remotion bundle',
  );
  cachedServeUrl = serveUrl;
  onStage?.('bundle', { status: 'completed', serveUrl });
  return serveUrl;
}

/**
 * Burn the configured title + caption overlays onto the trimmed clip with
 * Remotion. Returns `outputPath`. Requires Chromium in the worker environment.
 */
export async function renderTextOverlay(
  cfg: RenderTextOverlayConfig,
): Promise<string> {
  const serveUrl = await getServeUrl(cfg.onStage);
  const videoDir = path.dirname(cfg.videoPath);
  const videoFileName = path.basename(cfg.videoPath);

  cfg.onStage?.('serve_media', { status: 'started', videoFileName });
  const mediaServer = await serveLocalMediaDirectory(videoDir);
  const videoSrc = mediaServer.fileUrl(videoFileName);
  cfg.onStage?.('serve_media', { status: 'ready', videoSrc });

  try {
    const animation = cfg.addTitle && cfg.titleStyleSpec
      ? cfg.titleStyleSpec.animation
      : cfg.captionStyleSpec?.animation;
    const compositionId = compositionIdForAnimation(animation);

    const inputProps: TextOverlayProps = {
      // OffthreadVideo downloads via http/https only — expose the trimmed clip
      // from a loopback server while renderMedia runs.
      videoSrc,
      width: cfg.width,
      height: cfg.height,
      durationSec: cfg.durationSec,
      addTitle: cfg.addTitle,
      titleText: cfg.titleText,
      titleStyleSpec: cfg.titleStyleSpec,
      titlePosition: cfg.titlePosition,
      titleDurationSec: cfg.titleDurationSec,
      addCaptions: cfg.addCaptions,
      captionStyleSpec: cfg.captionStyleSpec,
      captionPosition: cfg.captionPosition,
      captions: cfg.captions,
    };

    cfg.onStage?.('select_composition', { compositionId, durationSec: cfg.durationSec });
    const composition = await withTimeout(
      selectComposition({
        serveUrl,
        id: compositionId,
        inputProps: inputProps as unknown as Record<string, unknown>,
        timeoutInMilliseconds: REMOTION_RENDER_TIMEOUT_MS,
      }),
      REMOTION_RENDER_TIMEOUT_MS,
      'Remotion selectComposition',
    );
    cfg.onStage?.('select_composition', {
      status: 'completed',
      durationInFrames: composition.durationInFrames,
      fps: composition.fps,
    });

    cfg.onStage?.('render_media', {
      status: 'started',
      compositionId,
      durationInFrames: composition.durationInFrames,
    });
    await withTimeout(
      renderMedia({
        serveUrl,
        composition,
        codec: 'h264',
        outputLocation: cfg.outputPath,
        inputProps: inputProps as unknown as Record<string, unknown>,
        timeoutInMilliseconds: REMOTION_RENDER_TIMEOUT_MS,
        onProgress: ({ progress }) => {
          cfg.onStage?.('render_media', {
            status: 'progress',
            progressPct: Math.round(progress * 100),
          });
        },
      }),
      REMOTION_RENDER_TIMEOUT_MS,
      'Remotion renderMedia',
    );
    cfg.onStage?.('render_media', { status: 'completed', outputPath: cfg.outputPath });

    return cfg.outputPath;
  } finally {
    await mediaServer.close();
  }
}

/** @internal Reset cached bundle between tests. */
export const resetRemotionBundleCacheForTests = (): void => {
  cachedServeUrl = null;
};
