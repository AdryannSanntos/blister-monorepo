import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../fonts";
import { colors, radius } from "../tokens";

type AnimatedBadgeProps = {
  label: string;
  delay?: number;
  duration?: number;
  color?: string;
  background?: string;
  fontSize?: number;
  style?: React.CSSProperties;
};

export const AnimatedBadge: React.FC<AnimatedBadgeProps> = ({
  label,
  delay = 0,
  duration = 18,
  color = colors.accent,
  background = colors.accentSoft,
  fontSize = 14,
  style,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  const opacity = interpolate(adjustedFrame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(adjustedFrame, [0, duration], [0.8, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 12px",
        borderRadius: radius.full,
        background,
        color,
        fontSize,
        fontFamily: fontFamily.sans,
        fontWeight: 500,
        opacity,
        transform: `scale(${scale})`,
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {label}
    </div>
  );
};
