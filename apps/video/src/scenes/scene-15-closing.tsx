import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { colors } from "@/tokens";
import { fontFamily } from "@/fonts";
import { GridBackground } from "@/primitives/grid-background";

const entranceEasing = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene15Closing: React.FC = () => {
  const frame = useCurrentFrame();

  // Wordmark entrance with gentle spring
  const wordmarkDelay = 10;
  const wordmarkAdj = frame - wordmarkDelay;

  const wordmarkOpacity = interpolate(wordmarkAdj, [0, 30], [0, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wordmarkTranslateY = interpolate(wordmarkAdj, [0, 30], [25, 0], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const wordmarkScale = interpolate(wordmarkAdj, [0, 30], [0.96, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tagline entrance
  const taglineDelay = 25;
  const taglineAdj = frame - taglineDelay;

  const taglineOpacity = interpolate(taglineAdj, [0, 28], [0, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineTranslateY = interpolate(taglineAdj, [0, 28], [18, 0], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle radial glow behind wordmark
  const glowOpacity = interpolate(frame, [15, 50], [0, 0.14], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowScale = interpolate(frame, [15, 70], [0.7, 1.15], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Accent dot separator
  const dotDelay = 20;
  const dotAdj = frame - dotDelay;

  const dotOpacity = interpolate(dotAdj, [0, 15], [0, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotScale = interpolate(dotAdj, [0, 15], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      {/* Very subtle grid background */}
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Radial glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 700,
          height: 700,
          marginLeft: -350,
          marginTop: -350,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, transparent 70%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Center content */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 0,
            marginTop: -20,
          }}
        >
          {/* Wordmark */}
          <div
            style={{
              fontFamily: fontFamily.serif,
              fontSize: 80,
              fontWeight: 400,
              color: colors.fgPrimary,
              letterSpacing: -1,
              opacity: wordmarkOpacity,
              transform: `translateY(${wordmarkTranslateY}px) scale(${wordmarkScale})`,
            }}
          >
            Workana AI
          </div>

          {/* Accent dot */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.accent,
              opacity: dotOpacity,
              transform: `scale(${dotScale})`,
              marginTop: 20,
              marginBottom: 20,
            }}
          />

          {/* Tagline */}
          <div
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 28,
              fontWeight: 400,
              color: colors.fgSecondary,
              letterSpacing: 2,
              opacity: taglineOpacity,
              transform: `translateY(${taglineTranslateY}px)`,
            }}
          >
            Contexto. Governança. Execução.
          </div>
        </div>
      </AbsoluteFill>

      {/* No caption for Scene 15 */}
    </AbsoluteFill>
  );
};
