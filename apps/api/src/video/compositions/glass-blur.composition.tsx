import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

import { KaraokeCaptions, VideoBackground, anchorStyle } from './shared';
import type { StyleCompositionProps } from './shared';

/** Glass Blur — frosted translucent panel behind the title. */
export const GlassBlurComposition: React.FC<StyleCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const title = props.titleStyleSpec;
  const showTitle =
    props.addTitle && title && frame <= props.titleDurationSec * fps + fps;

  const enter = interpolate(frame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const titleOpacity = interpolate(
    frame,
    [0, fps * 0.5, props.titleDurationSec * fps, props.titleDurationSec * fps + fps],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const glassBg = title?.bgColor ?? 'rgba(255,255,255,0.12)';

  return (
    <AbsoluteFill>
      <VideoBackground src={props.videoSrc} />

      {showTitle && title ? (
        <div style={{ ...anchorStyle(props.titlePosition), opacity: titleOpacity }}>
          <div
            style={{
              fontFamily: title.fontFamily,
              fontSize: title.fontSize,
              fontWeight: 500,
              color: title.color,
              padding: '0.4em 0.7em',
              borderRadius: 18,
              backgroundColor: glassBg,
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.18)',
              transform: `translateY(${interpolate(enter, [0, 1], [16, 0])}px)`,
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
          bgColor={props.captionStyleSpec.bgColor ?? 'rgba(255,255,255,0.12)'}
          highlightColor={props.captionStyleSpec.shadowColor ?? '#38bdf8'}
        />
      ) : null}
    </AbsoluteFill>
  );
};
