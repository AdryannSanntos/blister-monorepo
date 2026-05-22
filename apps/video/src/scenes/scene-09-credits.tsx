import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";
import { AnimatedCard } from "@/primitives/animated-card";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "Créditos tornam a inteligência mensurável. O uso se torna visível, controlado e rastreável no nível da empresa.";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const BARS = [
  { label: "Execuções", percentage: 75, delay: 15 },
  { label: "Análises", percentage: 45, delay: 25 },
  { label: "Automações", percentage: 30, delay: 35 },
] as const;

const BARS_LEFT = 180;
const BARS_TOP = 260;
const BAR_WIDTH = 560;
const BAR_HEIGHT = 36;
const BAR_GAP = 80;
const CARD_LEFT = 920;
const CARD_TOP = 260;

export const Scene09Credits: React.FC = () => {
  const frame = useCurrentFrame();

  // Counter animation from 0 to 2847
  const counterValue = Math.round(
    interpolate(frame, [30, 90], [0, 2847], {
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  const counterFormatted = counterValue.toLocaleString("pt-BR");

  const counterOpacity = interpolate(frame, [30, 45], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Circular progress indicator — 2847/5000 = ~57%
  const circleProgress = interpolate(frame, [50, 95], [0, 0.569], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const circleRadius = 52;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference * (1 - circleProgress);

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Section title */}
      <FadeIn delay={5} duration={20}>
        <div
          style={{
            position: "absolute",
            top: 190,
            left: BARS_LEFT,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 13,
              fontWeight: 500,
              color: colors.fgQuaternary,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Consumo por categoria
          </span>
        </div>
      </FadeIn>

      {/* Progress bars */}
      {BARS.map((bar, i) => {
        const barY = BARS_TOP + i * BAR_GAP;
        const adj = frame - bar.delay;

        const labelOpacity = interpolate(adj, [0, 15], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const barFill = interpolate(adj, [5, 45], [0, bar.percentage / 100], {
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const barTrackOpacity = interpolate(adj, [0, 12], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const percentText = Math.round(barFill * 100);

        return (
          <div key={bar.label}>
            {/* Label and percentage */}
            <div
              style={{
                position: "absolute",
                top: barY - 26,
                left: BARS_LEFT,
                width: BAR_WIDTH,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                opacity: labelOpacity,
              }}
            >
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 15,
                  fontWeight: 500,
                  color: colors.fgSecondary,
                }}
              >
                {bar.label}
              </span>
              <span
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 14,
                  fontWeight: 500,
                  color: colors.fgTertiary,
                }}
              >
                {percentText}%
              </span>
            </div>

            {/* Bar track */}
            <div
              style={{
                position: "absolute",
                top: barY,
                left: BARS_LEFT,
                width: BAR_WIDTH,
                height: BAR_HEIGHT,
                borderRadius: radius.sm,
                background: colors.bgSunken,
                border: `1px solid ${colors.lineSubtle}`,
                opacity: barTrackOpacity,
                overflow: "hidden",
              }}
            >
              {/* Bar fill */}
              <div
                style={{
                  width: BAR_WIDTH * barFill,
                  height: "100%",
                  borderRadius: radius.sm,
                  background: `linear-gradient(90deg, ${colors.premium}, ${colors.premium}dd)`,
                  boxShadow: `0 0 12px ${colors.premium}44`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Counter below bars */}
      <div
        style={{
          position: "absolute",
          top: BARS_TOP + 2 * BAR_GAP + BAR_HEIGHT + 48,
          left: BARS_LEFT,
          opacity: counterOpacity,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.mono,
            fontSize: 36,
            fontWeight: 500,
            color: colors.fgPrimary,
            letterSpacing: -0.5,
          }}
        >
          {counterFormatted}
        </span>
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 16,
            fontWeight: 400,
            color: colors.fgTertiary,
            marginLeft: 12,
          }}
        >
          créditos utilizados
        </span>
      </div>

      {/* Right side card */}
      <AnimatedCard
        delay={18}
        duration={25}
        width={420}
        padding={36}
        borderRadius={radius.xl}
        style={{
          position: "absolute",
          top: CARD_TOP,
          left: CARD_LEFT,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 28,
        }}
      >
        {/* Circular progress indicator */}
        <div style={{ position: "relative", width: 130, height: 130 }}>
          <svg width={130} height={130} viewBox="0 0 130 130">
            {/* Track */}
            <circle
              cx={65}
              cy={65}
              r={circleRadius}
              fill="none"
              stroke={colors.bgSunken}
              strokeWidth={10}
            />
            {/* Progress arc */}
            <circle
              cx={65}
              cy={65}
              r={circleRadius}
              fill="none"
              stroke={colors.premium}
              strokeWidth={10}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 65 65)"
              style={{ filter: `drop-shadow(0 0 6px ${colors.premium}66)` }}
            />
          </svg>
          {/* Center text */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 130,
              height: 130,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 22,
                fontWeight: 500,
                color: colors.fgPrimary,
              }}
            >
              {Math.round(circleProgress * 100)}%
            </span>
          </div>
        </div>

        {/* Limit info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 13,
              fontWeight: 500,
              color: colors.fgQuaternary,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Limite mensal
          </span>
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 28,
              fontWeight: 500,
              color: colors.fgPrimary,
            }}
          >
            5.000
          </span>
        </div>

        {/* Premium badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 14px",
            borderRadius: radius.full,
            background: `${colors.premium}18`,
            border: `1px solid ${colors.premium}33`,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              backgroundColor: colors.premium,
            }}
          />
          <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 13,
              fontWeight: 500,
              color: colors.premium,
            }}
          >
            Plano Pro ativo
          </span>
        </div>
      </AnimatedCard>

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
