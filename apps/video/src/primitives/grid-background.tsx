import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../tokens";

type GridBackgroundProps = {
  cellSize?: number;
  color?: string;
  delay?: number;
  fadeDuration?: number;
};

export const GridBackground: React.FC<GridBackgroundProps> = ({
  cellSize = 60,
  color = colors.lineSubtle,
  delay = 0,
  fadeDuration = 30,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  const opacity = interpolate(adjustedFrame, [0, fadeDuration], [0, 1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        backgroundImage: `
          radial-gradient(circle at top center, ${colors.accentSoft} 0%, transparent 35%),
          linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 45%, rgba(0,0,0,0.08) 100%),
          linear-gradient(${color} 1px, transparent 1px),
          linear-gradient(90deg, ${color} 1px, transparent 1px)
        `,
        backgroundSize: `100% 100%, 100% 100%, ${cellSize}px ${cellSize}px, ${cellSize}px ${cellSize}px`,
      }}
    />
  );
};
