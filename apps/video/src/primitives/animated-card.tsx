import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";
import { colors, radius } from "../tokens";

type AnimatedCardProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  width?: number | string;
  height?: number | string;
  padding?: number;
  borderRadius?: number;
  background?: string;
  borderColor?: string;
  shadow?: boolean;
  style?: React.CSSProperties;
};

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  delay = 0,
  duration = 22,
  width,
  height,
  padding = 24,
  borderRadius = radius.lg,
  background = colors.bgRaised,
  borderColor = colors.lineDefault,
  shadow = true,
  style,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  const opacity = interpolate(adjustedFrame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(adjustedFrame, [0, duration], [0.95, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(adjustedFrame, [0, duration], [12, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        padding,
        borderRadius,
        background,
        border: `1px solid ${borderColor}`,
        boxShadow: shadow
          ? `0 1px 0 0 ${colors.bgOverlay} inset, 0 4px 12px ${colors.lineSubtle}`
          : undefined,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
