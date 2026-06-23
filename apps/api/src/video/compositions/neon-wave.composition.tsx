import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { KaraokeCaptions, VideoBackground, anchorStyle } from './shared';
import type { StyleCompositionProps } from './shared';

/** Neon Wave — white text with a pulsing colored glow + color-wave on the blur. */
export const NeonWaveComposition: React.FC<StyleCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const title = props.titleStyleSpec;
  const showTitle =
    props.addTitle && title && frame <= props.titleDurationSec * fps + fps;

  const glow = title?.shadowColor ?? '#7C3AED';
  const pulse = 0.5 + 0.5 * Math.sin((frame / fps) * Math.PI * 1.5);
  const blurRadius = interpolate(pulse, [0, 1], [10, 26]);
  const titleOpacity = interpolate(
    frame,
    [0, fps * 0.4, props.titleDurationSec * fps, props.titleDurationSec * fps + fps],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  return (
    <AbsoluteFill>
      <VideoBackground src={props.videoSrc} />

      {showTitle && title ? (
        <div style={{ ...anchorStyle(props.titlePosition), opacity: titleOpacity }}>
          <div
            style={{
              fontFamily: title.fontFamily,
              fontSize: title.fontSize,
              fontWeight: 900,
              color: title.color,
              textTransform: 'uppercase',
              letterSpacing: '0.01em',
              textShadow: `0 0 ${blurRadius}px ${glow}, 0 0 ${blurRadius * 2}px ${glow}`,
            }}
          >
            {props.titleText}
          </div>
        </div>
      ) : null}

      {props.addCaptions && props.captionStyleSpec ? (
        <KaraokeCaptions
          captions={props.captions}
          currentMs={currentMs}
          position={props.captionPosition}
          fontFamily={props.captionStyleSpec.fontFamily}
          fontSize={props.captionStyleSpec.fontSize}
          color={props.captionStyleSpec.color}
          highlightColor={props.captionStyleSpec.shadowColor ?? glow}
        />
      ) : null}
    </AbsoluteFill>
  );
};
