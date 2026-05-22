import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors } from "../tokens";

type AnimatedLineProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay?: number;
  duration?: number;
  color?: string;
  strokeWidth?: number;
  dashed?: boolean;
};

export const AnimatedLine: React.FC<AnimatedLineProps> = ({
  x1,
  y1,
  x2,
  y2,
  delay = 0,
  duration = 20,
  color = colors.lineDefault,
  strokeWidth = 1.5,
  dashed = false,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

  const progress = interpolate(adjustedFrame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dashOffset = length * (1 - progress);

  return (
    <svg
      style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={dashed ? "6 4" : `${length}`}
        strokeDashoffset={dashed ? undefined : dashOffset}
        strokeLinecap="round"
        style={{ opacity: dashed ? interpolate(adjustedFrame, [0, duration * 0.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1 }}
      />
    </svg>
  );
};
