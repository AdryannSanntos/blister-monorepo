import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

import { compositionIdForAnimation } from './text-style.registry';
import { resolveRemotionEntryPoint } from './resolve-remotion-entry-point';
import { serveLocalMediaDirectory } from './serve-local-media';
import type { OverlayCaption, OverlayPoint, TextOverlayProps } from './compositions/types';
import type { TextStyleSpec } from '@company-os/types';

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
}

let cachedServeUrl: string | null = null;

/**
 * Bundle the Remotion entry once per worker process. The bundler compiles the
 * `.tsx` compositions with its own toolchain (independent of the Nest build).
 */
async function getServeUrl(): Promise<string> {
  if (cachedServeUrl) return cachedServeUrl;
  const entryPoint = await resolveRemotionEntryPoint();
  const serveUrl = await bundle({ entryPoint });
  cachedServeUrl = serveUrl;
  return serveUrl;
}

/**
 * Burn the configured title + caption overlays onto the trimmed clip with
 * Remotion. Returns `outputPath`. Requires Chromium in the worker environment.
 */
export async function renderTextOverlay(
  cfg: RenderTextOverlayConfig,
): Promise<string> {
  const serveUrl = await getServeUrl();
  const videoDir = path.dirname(cfg.videoPath);
  const videoFileName = path.basename(cfg.videoPath);
  const mediaServer = await serveLocalMediaDirectory(videoDir);

  try {
    const animation = cfg.addTitle && cfg.titleStyleSpec
      ? cfg.titleStyleSpec.animation
      : cfg.captionStyleSpec?.animation;
    const compositionId = compositionIdForAnimation(animation);

    const inputProps: TextOverlayProps = {
      // OffthreadVideo downloads via http/https only — expose the trimmed clip
      // from a loopback server while renderMedia runs.
      videoSrc: mediaServer.fileUrl(videoFileName),
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

    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: inputProps as unknown as Record<string, unknown>,
    });

    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: cfg.outputPath,
      inputProps: inputProps as unknown as Record<string, unknown>,
    });

    return cfg.outputPath;
  } finally {
    await mediaServer.close();
  }
}
