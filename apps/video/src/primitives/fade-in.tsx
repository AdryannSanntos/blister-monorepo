import type React from "react";
import { Easing, interpolate, useCurrentFrame } from "remotion";

type FadeInProps = {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
};

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 20,
  style,
}) => {
  const frame = useCurrentFrame();
  const adjustedFrame = frame - delay;

  const opacity = interpolate(adjustedFrame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return <div style={{ opacity, ...style }}>{children}</div>;
};
