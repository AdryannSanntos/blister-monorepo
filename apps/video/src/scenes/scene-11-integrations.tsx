import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { AnimatedLine } from "@/primitives/animated-line";
import { FadeIn } from "@/primitives/fade-in";

const CAPTION =
  "Integrações conectam o Workana AI ao resto da operação. Contexto e execução não param na borda da plataforma.";

const CENTER_X = 960;
const CENTER_Y = 480;
const ORBIT_RADIUS = 280;

const services = [
  "Slack",
  "GitHub",
  "Google Drive",
  "Notion",
  "Jira",
  "Figma",
];

const serviceAngles = services.map(
  (_, i) => (i * (2 * Math.PI)) / services.length - Math.PI / 2,
);

const servicePositions = serviceAngles.map((angle) => ({
  x: CENTER_X + Math.cos(angle) * ORBIT_RADIUS,
  y: CENTER_Y + Math.sin(angle) * ORBIT_RADIUS,
}));

const entranceEasing = Easing.bezier(0.16, 1, 0.3, 1);

export const Scene11Integrations: React.FC = () => {
  const frame = useCurrentFrame();

  // Central card entrance
  const centerOpacity = interpolate(frame, [0, 22], [0, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const centerScale = interpolate(frame, [0, 22], [0.9, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const centerTranslateY = interpolate(frame, [0, 22], [15, 0], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle pulsing glow on center card
  const glowOpacity = interpolate(frame, [25, 60], [0, 0.2], {
    easing: Easing.bezier(0.45, 0, 0.55, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      {/* Subtle radial glow at center */}
      <div
        style={{
          position: "absolute",
          top: CENTER_Y - 250,
          left: CENTER_X - 250,
          width: 500,
          height: 500,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Animated lines from center to each service node */}
      {servicePositions.map((pos, i) => {
        const lineDelay = 20 + i * 8;
        return (
          <AnimatedLine
            key={`line-${services[i]}`}
            x1={CENTER_X}
            y1={CENTER_Y}
            x2={pos.x}
            y2={pos.y}
            delay={lineDelay}
            duration={25}
            color={colors.accentSoftHi}
            strokeWidth={2}
          />
        );
      })}

      {/* Central platform node */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X - 110,
          top: CENTER_Y - 48,
          width: 220,
          height: 96,
          borderRadius: radius.xl,
          background: colors.bgRaised,
          border: `2px solid ${colors.accent}`,
          boxShadow: `0 0 0 4px ${colors.accentSoft}, 0 4px 16px rgba(0,0,0,0.08), 0 1px 0 0 rgba(255,255,255,0.8) inset`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: centerOpacity,
          transform: `scale(${centerScale}) translateY(${centerTranslateY}px)`,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.serif,
            fontSize: 26,
            fontWeight: 400,
            color: colors.fgPrimary,
            letterSpacing: -0.3,
          }}
        >
          Workana AI
        </span>
      </div>

      {/* Service nodes */}
      {services.map((service, i) => {
        const pos = servicePositions[i];
        const nodeDelay = 18 + i * 8;
        const adjustedFrame = frame - nodeDelay;

        const nodeOpacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const nodeScale = interpolate(adjustedFrame, [0, 20], [0.8, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const nodeTranslateY = interpolate(adjustedFrame, [0, 20], [10, 0], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Connection dot at the end of each line
        const dotDelay = 40 + i * 8;
        const dotAdjusted = frame - dotDelay;
        const dotScale = interpolate(dotAdjusted, [0, 12], [0, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const nodeWidth = service === "Google Drive" ? 150 : 120;

        return (
          <React.Fragment key={service}>
            {/* Connection dot at center end */}
            <div
              style={{
                position: "absolute",
                left: pos.x - 4,
                top: pos.y - 4,
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.accent,
                transform: `scale(${dotScale})`,
                opacity: dotScale,
              }}
            />

            {/* Service card */}
            <div
              style={{
                position: "absolute",
                left: pos.x - nodeWidth / 2,
                top: pos.y - 26,
                width: nodeWidth,
                height: 52,
                borderRadius: radius.lg,
                background: colors.bgRaised,
                border: `1px solid ${colors.lineDefault}`,
                boxShadow:
                  "0 1px 0 0 rgba(255,255,255,0.8) inset, 0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: nodeOpacity,
                transform: `scale(${nodeScale}) translateY(${nodeTranslateY}px)`,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: colors.fgSecondary,
                  letterSpacing: 0.1,
                }}
              >
                {service}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Decorative orbit ring */}
      <svg
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
        }}
      >
        <circle
          cx={CENTER_X}
          cy={CENTER_Y}
          r={ORBIT_RADIUS}
          fill="none"
          stroke={colors.lineSubtle}
          strokeWidth={1}
          strokeDasharray="4 8"
          opacity={interpolate(frame, [10, 35], [0, 0.6], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })}
        />
      </svg>

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
