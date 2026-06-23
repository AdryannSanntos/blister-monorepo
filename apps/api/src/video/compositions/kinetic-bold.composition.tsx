import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

import { KaraokeCaptions, VideoBackground, anchorStyle } from './shared';
import type { StyleCompositionProps } from './shared';

/** Kinetic Bold — each title word springs in, word by word. */
export const KineticBoldComposition: React.FC<StyleCompositionProps> = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const title = props.titleStyleSpec;
  const showTitle =
    props.addTitle && title && frame <= props.titleDurationSec * fps + fps;
  const words = props.titleText.split(/\s+/).filter(Boolean);

  const titleOpacity = interpolate(
    frame,
    [props.titleDurationSec * fps, props.titleDurationSec * fps + fps],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  const accent = title?.shadowColor ?? '#8b7cff';

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
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.25em',
              justifyContent: 'center',
              textShadow: '0 3px 12px rgba(0,0,0,0.6)',
            }}
          >
            {words.map((word, index) => {
              const enter = spring({
                frame: frame - index * 4,
                fps,
                config: { damping: 12, stiffness: 180, mass: 0.6 },
              });
              return (
                <span
                  // biome-ignore lint/suspicious/noArrayIndexKey: positional words
                  key={index}
                  style={{
                    display: 'inline-block',
                    transform: `scale(${enter})`,
                    color: index % 2 === 1 ? accent : title.color,
                  }}
                >
                  {word}
                </span>
              );
            })}
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
          highlightColor={accent}
        />
      ) : null}
    </AbsoluteFill>
  );
};
