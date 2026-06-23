import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { KaraokeCaptions, VideoBackground, anchorStyle } from './shared';
import type { StyleCompositionProps } from './shared';

/** Broadcast — solid lower-third bar that slides in from the left. */
export const BroadcastComposition: React.FC<StyleCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const title = props.titleStyleSpec;
  const showTitle =
    props.addTitle && title && frame <= props.titleDurationSec * fps + fps;

  const slideIn = interpolate(frame, [0, fps * 0.45], [-110, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const slideOut = interpolate(
    frame,
    [props.titleDurationSec * fps, props.titleDurationSec * fps + fps * 0.6],
    [0, -110],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const barBg = title?.bgColor ?? '#EF4444';

  return (
    <AbsoluteFill>
      <VideoBackground src={props.videoSrc} />

      {showTitle && title ? (
        <div style={{ ...anchorStyle(props.titlePosition), justifyContent: 'flex-start' }}>
          <div
            style={{
              fontFamily: title.fontFamily,
              fontSize: title.fontSize,
              fontWeight: 700,
              color: title.color,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              padding: '0.35em 0.8em',
              backgroundColor: barBg,
              transform: `translateX(${slideIn + slideOut}%)`,
              boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
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
          bgColor={props.captionStyleSpec.bgColor ?? barBg}
          highlightColor={props.captionStyleSpec.shadowColor ?? '#ffffff'}
        />
      ) : null}
    </AbsoluteFill>
  );
};
