import React from 'react';
import { AbsoluteFill, OffthreadVideo } from 'remotion';

import type { OverlayCaption, OverlayPoint, TextOverlayProps } from './types';

/** Background = the trimmed clip, filling the 9:16 frame. */
export const VideoBackground: React.FC<{ src: string }> = ({ src }) => {
  if (!src) return <AbsoluteFill style={{ backgroundColor: '#000' }} />;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      <OffthreadVideo src={src} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </AbsoluteFill>
  );
};

/** Absolute positioning for an overlay box centered on a normalized point. */
export function anchorStyle(point: OverlayPoint): React.CSSProperties {
  return {
    position: 'absolute',
    left: `${point.x * 100}%`,
    top: `${point.y * 100}%`,
    transform: 'translate(-50%, -50%)',
    width: '86%',
    textAlign: 'center',
    display: 'flex',
    justifyContent: 'center',
  };
}

/** Group caption tokens into displayable lines of up to `maxWords` words. */
export function chunkCaptionsIntoLines(
  captions: OverlayCaption[],
  maxWords = 6,
): OverlayCaption[][] {
  const lines: OverlayCaption[][] = [];
  for (let i = 0; i < captions.length; i += maxWords) {
    lines.push(captions.slice(i, i + maxWords));
  }
  return lines;
}

/** The line active at `currentMs`, plus the active word index within it. */
export function activeCaptionLine(
  lines: OverlayCaption[][],
  currentMs: number,
): { line: OverlayCaption[]; activeWordIndex: number } | null {
  for (const line of lines) {
    const start = line[0]?.startMs ?? 0;
    const end = line[line.length - 1]?.endMs ?? 0;
    if (currentMs >= start && currentMs <= end) {
      const activeWordIndex = line.findIndex(
        (token) => currentMs >= token.startMs && currentMs <= token.endMs,
      );
      return { line, activeWordIndex };
    }
  }
  return null;
}

type KaraokeCaptionsProps = {
  captions: OverlayCaption[];
  currentMs: number;
  position: OverlayPoint;
  fontFamily: string;
  fontSize: number;
  color: string;
  bgColor?: string;
  /** Tint applied to the word currently being spoken. */
  highlightColor: string;
};

/**
 * Word-level "karaoke" captions: the active line is shown and the word being
 * spoken is tinted. Shared by every style; each composition picks the colors.
 */
export const KaraokeCaptions: React.FC<KaraokeCaptionsProps> = ({
  captions,
  currentMs,
  position,
  fontFamily,
  fontSize,
  color,
  bgColor,
  highlightColor,
}) => {
  if (captions.length === 0) return null;
  const lines = chunkCaptionsIntoLines(captions);
  const active = activeCaptionLine(lines, currentMs);
  if (!active) return null;

  return (
    <div style={anchorStyle(position)}>
      <div
        style={{
          fontFamily,
          fontSize,
          fontWeight: 800,
          lineHeight: 1.15,
          color,
          padding: bgColor ? '0.3em 0.5em' : 0,
          borderRadius: bgColor ? 12 : 0,
          backgroundColor: bgColor,
          textShadow: bgColor ? undefined : '0 2px 8px rgba(0,0,0,0.55)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.25em',
          justifyContent: 'center',
        }}
      >
        {active.line.map((token, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional
            key={index}
            style={{
              color: index === active.activeWordIndex ? highlightColor : color,
              transition: 'color 60ms linear',
            }}
          >
            {token.text}
          </span>
        ))}
      </div>
    </div>
  );
};

export type StyleCompositionProps = TextOverlayProps;
