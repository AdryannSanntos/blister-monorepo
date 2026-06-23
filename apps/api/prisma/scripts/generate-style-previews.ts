/**
 * Renders looping 9:16 mp4 previews for each TEXT_STYLE composition.
 * Output: apps/web/public/marketplace/styles/{slug}-preview.mp4
 *
 * Run: pnpm --dir apps/api generate:style-previews
 */
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { textStyleSpecSchema } from '@company-os/types';

import { resolveRemotionEntryPoint } from '../../src/video/resolve-remotion-entry-point';
import type { OverlayCaption, TextOverlayProps } from '../../src/video/compositions/types';
import { textStylePreviewPath } from '../seed-marketplace';

const PREVIEW_DURATION_SEC = 3;
const WIDTH = 540;
const HEIGHT = 960;

const TEXT_STYLE_SPECS = [
  {
    slug: 'neon-wave',
    name: 'Neon Wave',
    spec: {
      previewUrl: textStylePreviewPath('neon-wave'),
      animation: 'neon-wave',
      fontFamily: 'Impact, Arial Black, sans-serif',
      fontSize: 72,
      color: '#FFFFFF',
      shadowColor: '#7C3AED',
    },
  },
  {
    slug: 'clean-split',
    name: 'Clean Split',
    spec: {
      previewUrl: textStylePreviewPath('clean-split'),
      animation: 'clean-split',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 60,
      color: '#F9FAFB',
    },
  },
  {
    slug: 'kinetic-bold',
    name: 'Kinetic Bold',
    spec: {
      previewUrl: textStylePreviewPath('kinetic-bold'),
      animation: 'kinetic-bold',
      fontFamily: 'Poppins, Arial Black, sans-serif',
      fontSize: 78,
      color: '#FFFFFF',
      shadowColor: '#000000',
    },
  },
  {
    slug: 'glass-blur',
    name: 'Glass Blur',
    spec: {
      previewUrl: textStylePreviewPath('glass-blur'),
      animation: 'glass-blur',
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 56,
      color: '#FFFFFF',
      bgColor: 'rgba(255,255,255,0.12)',
    },
  },
  {
    slug: 'broadcast',
    name: 'Broadcast',
    spec: {
      previewUrl: textStylePreviewPath('broadcast'),
      animation: 'broadcast',
      fontFamily: 'Roboto Condensed, Arial Narrow, sans-serif',
      fontSize: 54,
      color: '#FFFFFF',
      bgColor: '#EF4444',
    },
  },
] as const;

const SAMPLE_CAPTIONS: OverlayCaption[] = [
  { text: 'Your', startMs: 0, endMs: 350 },
  { text: 'story', startMs: 350, endMs: 700 },
  { text: 'starts', startMs: 700, endMs: 1050 },
  { text: 'here', startMs: 1050, endMs: 2800 },
];

async function main() {
  const outDir = path.resolve(__dirname, '../../../web/public/marketplace/styles');
  await mkdir(outDir, { recursive: true });

  const entryPoint = await resolveRemotionEntryPoint();
  console.log('\n→ Bundling Remotion compositions...');
  console.log(`  entry: ${entryPoint}`);
  const serveUrl = await bundle({ entryPoint });

  for (const entry of TEXT_STYLE_SPECS) {
    const styleSpec = textStyleSpecSchema.parse(entry.spec);
    const outputPath = path.join(outDir, `${entry.slug}-preview.mp4`);

    const inputProps: TextOverlayProps = {
      videoSrc: '',
      width: WIDTH,
      height: HEIGHT,
      durationSec: PREVIEW_DURATION_SEC,
      addTitle: true,
      titleText: entry.name,
      titleStyleSpec: styleSpec,
      titlePosition: { x: 0.5, y: 0.22 },
      titleDurationSec: PREVIEW_DURATION_SEC,
      addCaptions: true,
      captionStyleSpec: styleSpec,
      captionPosition: { x: 0.5, y: 0.78 },
      captions: SAMPLE_CAPTIONS,
    };

    const composition = await selectComposition({
      serveUrl,
      id: entry.slug,
      inputProps: inputProps as unknown as Record<string, unknown>,
    });

    console.log(`  • Rendering ${entry.slug}...`);
    await renderMedia({
      serveUrl,
      composition,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: inputProps as unknown as Record<string, unknown>,
    });
  }

  console.log(`\n✅ Previews written to ${outDir}\n`);
}

main().catch((error) => {
  console.error('\n❌ Preview generation failed:', error);
  process.exit(1);
});
