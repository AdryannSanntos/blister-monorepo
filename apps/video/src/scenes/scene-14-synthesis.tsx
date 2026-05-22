import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { colors } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";

const CAPTION =
  "Do trabalho externo fragmentado para uma operação centralizada, clara e pronta para escalar.";

const entranceEasing = Easing.bezier(0.16, 1, 0.3, 1);
const editorialEasing = Easing.bezier(0.45, 0, 0.55, 1);

const keywords = [
  { label: "Workspace", startX: 180, startY: 150 },
  { label: "Equipe", startX: 1600, startY: 200 },
  { label: "Brain", startX: 350, startY: 800 },
  { label: "Materiais", startX: 1500, startY: 750 },
  { label: "Agentes", startX: 120, startY: 480 },
  { label: "Créditos", startX: 1700, startY: 500 },
  { label: "Histórico", startX: 500, startY: 120 },
  { label: "Integrações", startX: 1350, startY: 130 },
  { label: "Templates", startX: 250, startY: 650 },
  { label: "Visibilidade", startX: 1550, startY: 620 },
];

const CENTER_X = 960;
const CENTER_Y = 480;

export const Scene14Synthesis: React.FC = () => {
  const frame = useCurrentFrame();

  // Phase 1: Badges appear scattered (frames 0-30)
  // Phase 2: Badges converge to center (frames 30-65)
  // Phase 3: Badges fade, editorial text appears (frames 65-120)

  // Background warmth transition
  const warmth = interpolate(frame, [65, 95], [0, 1], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const bgColor = `rgb(${250 - warmth * 2}, ${249 - warmth * 3}, ${247 - warmth * 6})`;

  // Editorial text entrance
  const editorialDelay = 72;
  const editorialAdj = frame - editorialDelay;

  const editorialOpacity = interpolate(editorialAdj, [0, 30], [0, 1], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const editorialTranslateY = interpolate(editorialAdj, [0, 35], [30, 0], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const editorialScale = interpolate(editorialAdj, [0, 35], [0.96, 1], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge group fade out
  const badgeGroupFade = interpolate(frame, [60, 75], [1, 0], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Badge group scale down (compression)
  const badgeGroupScale = interpolate(frame, [55, 72], [1, 0.3], {
    easing: editorialEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      {/* Floating keyword badges */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: badgeGroupFade,
          transform: `scale(${badgeGroupScale})`,
          transformOrigin: `${CENTER_X}px ${CENTER_Y}px`,
        }}
      >
        {keywords.map((kw, i) => {
          // Phase 1: Appear
          const appearDelay = 2 + i * 2;
          const appearAdj = frame - appearDelay;
          const badgeOpacity = interpolate(appearAdj, [0, 15], [0, 1], {
            easing: entranceEasing,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const badgeScale = interpolate(appearAdj, [0, 15], [0.7, 1], {
            easing: Easing.bezier(0.34, 1.56, 0.64, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Phase 2: Converge to center
          const convergeStart = 30;
          const convergeDuration = 30;
          const convergeProgress = interpolate(
            frame,
            [convergeStart, convergeStart + convergeDuration],
            [0, 1],
            {
              easing: editorialEasing,
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            },
          );

          const currentX = interpolate(convergeProgress, [0, 1], [kw.startX, CENTER_X], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          const currentY = interpolate(convergeProgress, [0, 1], [kw.startY, CENTER_Y], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          // Slight floating motion in phase 1
          const floatY = frame < convergeStart
            ? Math.sin((frame + i * 12) * 0.08) * 6
            : Math.sin((frame + i * 12) * 0.08) * 6 * (1 - convergeProgress);

          return (
            <div
              key={kw.label}
              style={{
                position: "absolute",
                left: currentX,
                top: currentY + floatY,
                transform: `translate(-50%, -50%) scale(${badgeScale})`,
                opacity: badgeOpacity,
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 20px",
                borderRadius: 999,
                background: colors.accentSoft,
                color: colors.accent,
                fontSize: 15,
                fontFamily: fontFamily.sans,
                fontWeight: 500,
                whiteSpace: "nowrap",
                border: `1px solid ${colors.accentSoftHi}`,
              }}
            >
              {kw.label}
            </div>
          );
        })}
      </div>

      {/* Editorial statement */}
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            opacity: editorialOpacity,
            transform: `translateY(${editorialTranslateY}px) scale(${editorialScale})`,
            textAlign: "center",
            maxWidth: 1100,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.serif,
              fontSize: 62,
              fontWeight: 400,
              color: colors.fgPrimary,
              lineHeight: 1.25,
              letterSpacing: -0.5,
            }}
          >
            De trabalho externo fragmentado
          </span>
          <br />
          <span
            style={{
              fontFamily: fontFamily.serif,
              fontSize: 62,
              fontWeight: 400,
              color: colors.accent,
              lineHeight: 1.25,
              letterSpacing: -0.5,
            }}
            >
              para execução com contexto
            </span>
        </div>
      </AbsoluteFill>

      {/* Subtle accent underline decoration */}
      <div
        style={{
          position: "absolute",
          left: CENTER_X - 60,
          top: CENTER_Y + 65,
          width: interpolate(editorialAdj, [15, 40], [0, 120], {
            easing: entranceEasing,
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
          height: 3,
          backgroundColor: colors.accent,
          borderRadius: 2,
          opacity: editorialOpacity * 0.5,
        }}
      />

      {/* Caption at bottom */}
      <FadeIn delay={80} duration={25}>
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
