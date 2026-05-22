import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { AnimatedCard } from "@/primitives/animated-card";
import { FadeIn } from "@/primitives/fade-in";

const CAPTION =
  "Porque todo o sistema está conectado, visibilidade se torna parte do produto. Contexto, execução, atividade e resultados em uma visão operacional.";

const entranceEasing = Easing.bezier(0.16, 1, 0.3, 1);

const metrics = [
  { label: "Execuções", value: 1247, suffix: "" },
  { label: "Outputs", value: 892, suffix: "" },
  { label: "Aprovações", value: 94, suffix: "%" },
  { label: "Tempo médio", value: 2.3, suffix: "h", decimals: 1 },
];

const METRIC_CARD_W = 360;
const METRIC_CARD_H = 130;
const METRIC_GAP = 40;
const METRICS_TOTAL_W = metrics.length * METRIC_CARD_W + (metrics.length - 1) * METRIC_GAP;
const METRICS_START_X = (1920 - METRICS_TOTAL_W) / 2;
const METRICS_Y = 180;

// Bar chart
const barHeights = [0.55, 0.82, 0.68, 1.0, 0.75, 0.9];
const BAR_CHART_Y = 400;
const BAR_CHART_H = 360;
const BAR_W = 80;
const BAR_GAP = 50;
const BARS_TOTAL_W = barHeights.length * BAR_W + (barHeights.length - 1) * BAR_GAP;
const BARS_START_X = (1920 - BARS_TOTAL_W) / 2;

const formatNumber = (n: number, decimals?: number): string => {
  if (decimals !== undefined) {
    return n.toFixed(decimals);
  }
  return n >= 1000
    ? n.toLocaleString("pt-BR")
    : Math.round(n).toString();
};

export const Scene13Analytics: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      {/* Metric cards */}
      {metrics.map((metric, i) => {
        const cardDelay = 5 + i * 6;
        const x = METRICS_START_X + i * (METRIC_CARD_W + METRIC_GAP);

        // Counting animation
        const countStart = cardDelay + 10;
        const countDuration = 40;
        const countProgress = interpolate(
          frame - countStart,
          [0, countDuration],
          [0, 1],
          {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );

        const currentValue = metric.value * countProgress;
        const displayValue = formatNumber(currentValue, metric.decimals);

        return (
          <div
            key={metric.label}
            style={{ position: "absolute", left: x, top: METRICS_Y }}
          >
            <AnimatedCard
              delay={cardDelay}
              duration={22}
              width={METRIC_CARD_W}
              height={METRIC_CARD_H}
              padding={28}
              borderRadius={radius.xl}
            >
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 13,
                  fontWeight: 500,
                  color: colors.fgTertiary,
                  letterSpacing: 0.4,
                  marginBottom: 10,
                }}
              >
                {metric.label}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 42,
                  fontWeight: 500,
                  color: colors.fgPrimary,
                  letterSpacing: -1,
                  lineHeight: 1,
                }}
              >
                {displayValue}
                <span
                  style={{
                    fontSize: 22,
                    color: colors.fgTertiary,
                    fontWeight: 400,
                    marginLeft: 2,
                  }}
                >
                  {metric.suffix}
                </span>
              </div>
            </AnimatedCard>
          </div>
        );
      })}

      {/* Bar chart baseline */}
      <FadeIn delay={25} duration={20}>
        <div
          style={{
            position: "absolute",
            left: BARS_START_X - 20,
            top: BAR_CHART_Y + BAR_CHART_H,
            width: BARS_TOTAL_W + 40,
            height: 1,
            backgroundColor: colors.lineDefault,
          }}
        />
      </FadeIn>

      {/* Horizontal grid lines for chart */}
      {[0.25, 0.5, 0.75].map((pct, i) => {
        const lineY = BAR_CHART_Y + BAR_CHART_H * (1 - pct);
        const lineAdj = frame - (20 + i * 4);
        const lineOpacity = interpolate(lineAdj, [0, 15], [0, 0.3], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`gridline-${pct}`}
            style={{
              position: "absolute",
              left: BARS_START_X - 20,
              top: lineY,
              width: BARS_TOTAL_W + 40,
              height: 1,
              backgroundColor: colors.lineSubtle,
              opacity: lineOpacity,
            }}
          />
        );
      })}

      {/* Bars */}
      {barHeights.map((heightPct, i) => {
        const barDelay = 30 + i * 8;
        const adj = frame - barDelay;

        const barProgress = interpolate(adj, [0, 28], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const barH = heightPct * BAR_CHART_H * barProgress;
        const barX = BARS_START_X + i * (BAR_W + BAR_GAP);
        const barY = BAR_CHART_Y + BAR_CHART_H - barH;

        const barOpacity = interpolate(adj, [0, 12], [0, 1], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Subtle highlight shimmer on bars
        const shimmerDelay = barDelay + 20;
        const shimmerAdj = frame - shimmerDelay;
        const shimmerOpacity = interpolate(shimmerAdj, [0, 15], [0, 0.15], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`bar-${i}`}
            style={{
              position: "absolute",
              left: barX,
              top: barY,
              width: BAR_W,
              height: barH,
              borderTopLeftRadius: radius.sm,
              borderTopRightRadius: radius.sm,
              backgroundColor: colors.accent,
              opacity: barOpacity,
              overflow: "hidden",
            }}
          >
            {/* Inner shimmer */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "50%",
                background: `linear-gradient(180deg, rgba(255,255,255,${shimmerOpacity}) 0%, transparent 100%)`,
                borderTopLeftRadius: radius.sm,
                borderTopRightRadius: radius.sm,
              }}
            />
          </div>
        );
      })}

      {/* Bar labels below baseline */}
      {["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"].map((month, i) => {
        const labelDelay = 35 + i * 8;
        const adj = frame - labelDelay;
        const op = interpolate(adj, [0, 15], [0, 1], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const barX = BARS_START_X + i * (BAR_W + BAR_GAP);

        return (
          <div
            key={month}
            style={{
              position: "absolute",
              left: barX,
              top: BAR_CHART_Y + BAR_CHART_H + 12,
              width: BAR_W,
              textAlign: "center",
              fontFamily: fontFamily.mono,
              fontSize: 12,
              color: colors.fgTertiary,
              opacity: op,
            }}
          >
            {month}
          </div>
        );
      })}

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
