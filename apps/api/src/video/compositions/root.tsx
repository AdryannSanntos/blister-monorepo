import React from 'react';
import { Composition } from 'remotion';

import { BroadcastComposition } from './broadcast.composition';
import { CleanSplitComposition } from './clean-split.composition';
import { GlassBlurComposition } from './glass-blur.composition';
import { KineticBoldComposition } from './kinetic-bold.composition';
import { NeonWaveComposition } from './neon-wave.composition';
import { DEFAULT_TEXT_OVERLAY_PROPS, OVERLAY_FPS } from './types';
import type { TextOverlayProps } from './types';

const ENTRIES = [
  { id: 'neon-wave', component: NeonWaveComposition },
  { id: 'clean-split', component: CleanSplitComposition },
  { id: 'kinetic-bold', component: KineticBoldComposition },
  { id: 'glass-blur', component: GlassBlurComposition },
  { id: 'broadcast', component: BroadcastComposition },
] as const;

/**
 * Per-render metadata: dimensions and duration come from the clip props so a
 * single registration handles any clip length / size.
 */
function calculateMetadata({ props }: { props: TextOverlayProps }) {
  return {
    durationInFrames: Math.max(1, Math.ceil(props.durationSec * OVERLAY_FPS)),
    width: props.width,
    height: props.height,
    fps: OVERLAY_FPS,
  };
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {ENTRIES.map(({ id, component }) => (
        <Composition
          key={id}
          id={id}
          component={component as React.FC<Record<string, unknown>>}
          durationInFrames={Math.ceil(DEFAULT_TEXT_OVERLAY_PROPS.durationSec * OVERLAY_FPS)}
          fps={OVERLAY_FPS}
          width={DEFAULT_TEXT_OVERLAY_PROPS.width}
          height={DEFAULT_TEXT_OVERLAY_PROPS.height}
          defaultProps={DEFAULT_TEXT_OVERLAY_PROPS as unknown as Record<string, unknown>}
          calculateMetadata={calculateMetadata as never}
        />
      ))}
    </>
  );
};
