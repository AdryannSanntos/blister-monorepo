import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";
import { AnimatedLine } from "@/primitives/animated-line";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "O brain da empresa reúne conhecimento disperso em uma camada operacional. Processos, preferências, referências e contexto institucional se tornam reutilizáveis.";

const SATELLITES = [
  { label: "Processos", angle: -90 },
  { label: "Preferências", angle: -18 },
  { label: "Referências", angle: 54 },
  { label: "Guidelines", angle: 126 },
  { label: "Contexto", angle: 198 },
] as const;

const CENTER_X = 960;
const CENTER_Y = 470;
const ORBIT_RADIUS = 260;
const CENTER_RADIUS = 70;
const SAT_RADIUS = 46;

const ease = Easing.bezier(0.16, 1, 0.3, 1);
const editorialEase = Easing.bezier(0.45, 0, 0.55, 1);

export const Scene06Brain: React.FC = () => {
  const frame = useCurrentFrame();

  // Central node grows from center
  const centerScale = interpolate(frame, [8, 35], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const centerOpacity = interpolate(frame, [8, 28], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Central node border glow pulse
  const glowOpacity = interpolate(frame, [30, 60], [0, 0.35], {
    easing: editorialEase,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Slow editorial rotation of the entire constellation
  const constellationRotation = interpolate(frame, [0, 180], [0, 8], {
    easing: editorialEase,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Radial glow behind center */}
      <div
        style={{
          position: "absolute",
          top: CENTER_Y - 200,
          left: CENTER_X - 200,
          width: 400,
          height: 400,
          borderRadius: 999,
          background: `radial-gradient(circle, ${colors.accentSoft} 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Constellation wrapper with subtle rotation */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: 1920,
          height: 1080,
          transform: `rotate(${constellationRotation}deg)`,
          transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
        }}
      >
        {/* Connecting lines from satellites to center */}
        {SATELLITES.map((sat, i) => {
          const angleRad = (sat.angle * Math.PI) / 180;
          const satX = CENTER_X + Math.cos(angleRad) * ORBIT_RADIUS;
          const satY = CENTER_Y + Math.sin(angleRad) * ORBIT_RADIUS;

          // Line starts after satellite begins appearing
          const lineDelay = 50 + i * 10;

          return (
            <AnimatedLine
              key={`line-${sat.label}`}
              x1={CENTER_X}
              y1={CENTER_Y}
              x2={satX}
              y2={satY}
              delay={lineDelay}
              duration={25}
              color={colors.lineDefault}
              strokeWidth={1.5}
            />
          );
        })}

        {/* Center node */}
        <div
          style={{
            position: "absolute",
            top: CENTER_Y - CENTER_RADIUS,
            left: CENTER_X - CENTER_RADIUS,
            width: CENTER_RADIUS * 2,
            height: CENTER_RADIUS * 2,
            borderRadius: 999,
            border: `3px solid ${colors.accent}`,
            background: colors.bgRaised,
            boxShadow: `0 0 0 8px ${colors.accentSoft}, 0 4px 20px rgba(0,0,0,0.08)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: centerOpacity,
            transform: `scale(${centerScale})`,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.serif,
              fontSize: 26,
              fontWeight: 400,
              color: colors.accent,
              letterSpacing: -0.3,
              // Counter-rotate text so it stays upright
              transform: `rotate(${-constellationRotation}deg)`,
            }}
          >
            Brain
          </span>
        </div>

        {/* Satellite nodes */}
        {SATELLITES.map((sat, i) => {
          const angleRad = (sat.angle * Math.PI) / 180;
          const satX = CENTER_X + Math.cos(angleRad) * ORBIT_RADIUS;
          const satY = CENTER_Y + Math.sin(angleRad) * ORBIT_RADIUS;

          const satDelay = 40 + i * 10;

          const satOpacity = interpolate(frame - satDelay, [0, 22], [0, 1], {
            easing: ease,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const satScale = interpolate(frame - satDelay, [0, 22], [0, 1], {
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={`sat-${sat.label}`}
              style={{
                position: "absolute",
                top: satY - SAT_RADIUS,
                left: satX - SAT_RADIUS,
                width: SAT_RADIUS * 2,
                height: SAT_RADIUS * 2,
                borderRadius: 999,
                border: `1.5px solid ${colors.lineDefault}`,
                background: colors.bgRaised,
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: satOpacity,
                transform: `scale(${satScale})`,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  color: colors.fgSecondary,
                  whiteSpace: "nowrap",
                  // Counter-rotate text so it stays upright
                  transform: `rotate(${-constellationRotation}deg)`,
                }}
              >
                {sat.label}
              </span>
            </div>
          );
        })}

        {/* Small decorative dots on the orbit path */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((idx) => {
          const dotAngle = ((idx * 45 + 22.5) * Math.PI) / 180;
          const dotX = CENTER_X + Math.cos(dotAngle) * ORBIT_RADIUS;
          const dotY = CENTER_Y + Math.sin(dotAngle) * ORBIT_RADIUS;
          const dotDelay = 70 + idx * 4;

          const dotOpacity = interpolate(frame - dotDelay, [0, 15], [0, 0.3], {
            easing: ease,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={`dot-${idx}`}
              style={{
                position: "absolute",
                top: dotY - 3,
                left: dotX - 3,
                width: 6,
                height: 6,
                borderRadius: 999,
                backgroundColor: colors.accent,
                opacity: dotOpacity,
              }}
            />
          );
        })}
      </div>

      {/* Caption */}
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
