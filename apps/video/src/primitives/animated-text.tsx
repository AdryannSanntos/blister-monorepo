import type React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";
import { colors } from "../tokens";

type AnimatedTextProps = {
  text: string;
  fontSize?: number;
  color?: string;
  font?: "sans" | "mono" | "serif";
  fontWeight?: React.CSSProperties["fontWeight"];
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  distance?: number;
  duration?: number;
  style?: React.CSSProperties;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: React.CSSProperties["textAlign"];
};

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 48,
  color = colors.fgPrimary,
  font = "sans",
  fontWeight = 400,
  delay = 0,
  direction = "up",
  distance = 30,
  duration = 25,
  style,
  letterSpacing,
  lineHeight,
  textAlign = "center",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  const opacity = interpolate(adjustedFrame, [0, duration], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateMap = {
    up: { x: 0, y: distance },
    down: { x: 0, y: -distance },
    left: { x: distance, y: 0 },
    right: { x: -distance, y: 0 },
  };
  const { x: fromX, y: fromY } = translateMap[direction];

  const translateX = interpolate(adjustedFrame, [0, duration], [fromX, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(adjustedFrame, [0, duration], [fromY, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        fontSize,
        fontFamily: fontFamily[font],
        fontWeight,
        color,
        opacity,
        transform: `translate(${translateX}px, ${translateY}px)`,
        letterSpacing,
        lineHeight: lineHeight ? `${lineHeight}` : undefined,
        textAlign,
        whiteSpace: "pre-wrap",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
