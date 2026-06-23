import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { KaraokeCaptions, VideoBackground, anchorStyle } from './shared';
import type { StyleCompositionProps } from './shared';

/** Clean Split — thin text revealed by a horizontal clipPath curtain. */
export const CleanSplitComposition: React.FC<StyleCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const title = props.titleStyleSpec;
  const showTitle =
    props.addTitle && title && frame <= props.titleDurationSec * fps + fps;

  const reveal = interpolate(frame, [0, fps * 0.6], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOpacity = interpolate(
    frame,
    [0, fps * 0.3, props.titleDurationSec * fps, props.titleDurationSec * fps + fps],
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
              fontWeight: 300,
              color: title.color,
              letterSpacing: '0.02em',
              textShadow: '0 2px 10px rgba(0,0,0,0.45)',
              clipPath: `inset(0 ${100 - reveal}% 0 0)`,
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
          highlightColor={props.captionStyleSpec.shadowColor ?? '#ffffff'}
        />
      ) : null}
    </AbsoluteFill>
  );
};
