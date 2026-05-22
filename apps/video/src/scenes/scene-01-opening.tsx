import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors } from "@/tokens";
import { fontFamily } from "@/fonts";
import { AnimatedText } from "@/primitives/animated-text";
import { FadeIn } from "@/primitives/fade-in";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "Workana AI. A camada operacional para empresas que coordenam freelancers, fornecedores e times distribuídos.";

export const Scene01Opening: React.FC = () => {
  const frame = useCurrentFrame();

  // Subtle accent glow behind wordmark
  const glowOpacity = interpolate(frame, [20, 50], [0, 0.15], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowScale = interpolate(frame, [20, 80], [0.8, 1.1], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Decorative dot that pulses
  const dotScale = interpolate(frame, [60, 80], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotOpacity = interpolate(frame, [60, 75], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      {/* Subtle grid background */}
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Radial glow behind wordmark */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: 600,
          height: 600,
          marginLeft: -300,
          marginTop: -300,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, transparent 70%)`,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
        }}
      />

      {/* Center content container */}
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
            gap: 20,
            marginTop: -40,
          }}
        >
          {/* Wordmark */}
          <AnimatedText
            text="Workana AI"
            fontSize={96}
            font="serif"
            fontWeight={400}
            color={colors.fgPrimary}
            delay={10}
            direction="up"
            distance={40}
            duration={30}
            letterSpacing={-1}
          />

          {/* Accent dot separator */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.accent,
              opacity: dotOpacity,
              transform: `scale(${dotScale})`,
              marginTop: 4,
              marginBottom: 4,
            }}
          />

          {/* Subtitle */}
          <AnimatedText
            text="A camada operacional para trabalho externo"
            fontSize={28}
            font="sans"
            fontWeight={400}
            color={colors.fgSecondary}
            delay={28}
            direction="up"
            distance={24}
            duration={28}
            letterSpacing={0.2}
          />
        </div>
      </AbsoluteFill>

      {/* Caption at bottom */}
      <FadeIn delay={15} duration={25}>
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            maxWidth: 900,
            textAlign: "center",
            fontFamily: fontFamily.sans,
            fontSize: 18,
            color: colors.fgTertiary,
            lineHeight: "1.6",
          }}
        >
          {CAPTION}
        </div>
      </FadeIn>
    </AbsoluteFill>
  );
};
