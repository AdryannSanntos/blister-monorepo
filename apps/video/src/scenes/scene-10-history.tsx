import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "Toda execução deixa uma trilha. O que rodou, com qual contexto, para quem, e o que resultou.";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const EVENTS = [
  {
    label: "Briefing gerado",
    time: "10:32",
    statusColor: colors.success,
    statusLabel: "Concluído",
  },
  {
    label: "Review concluído",
    time: "11:15",
    statusColor: colors.accent,
    statusLabel: "Aprovado",
  },
  {
    label: "Material revisado",
    time: "14:47",
    statusColor: colors.warning,
    statusLabel: "Revisão",
  },
  {
    label: "Entrega concluída",
    time: "15:03",
    statusColor: colors.success,
    statusLabel: "Entregue",
  },
] as const;

const TIMELINE_X = 480;
const TIMELINE_TOP = 200;
const EVENT_GAP = 130;
const DOT_RADIUS = 10;
const CARD_OFFSET_X = 50;
const CARD_W = 500;
const CARD_H = 80;

export const Scene10History: React.FC = () => {
  const frame = useCurrentFrame();

  // Timeline vertical line grows downward
  const lineLength = EVENTS.length * EVENT_GAP;
  const lineProgress = interpolate(frame, [8, 60], [0, 1], {
    easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const lineOpacity = interpolate(frame, [8, 18], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Section header
  const headerOpacity = interpolate(frame, [3, 18], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const headerTranslateY = interpolate(frame, [3, 18], [15, 0], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Section header */}
      <div
        style={{
          position: "absolute",
          top: 150,
          left: TIMELINE_X + CARD_OFFSET_X,
          opacity: headerOpacity,
          transform: `translateY(${headerTranslateY}px)`,
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
          Histórico de execuções
        </span>
      </div>

      {/* Timeline vertical line */}
      <div
        style={{
          position: "absolute",
          top: TIMELINE_TOP,
          left: TIMELINE_X,
          width: 2,
          height: lineLength * lineProgress,
          background: `linear-gradient(to bottom, ${colors.lineStrong}, ${colors.lineDefault})`,
          borderRadius: 1,
          opacity: lineOpacity,
        }}
      />

      {/* Event items */}
      {EVENTS.map((event, i) => {
        const eventY = TIMELINE_TOP + i * EVENT_GAP;
        const eventDelay = 15 + i * 14;
        const adj = frame - eventDelay;

        // Dot animation
        const dotScale = interpolate(adj, [0, 18], [0, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const dotOpacity = interpolate(adj, [0, 12], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Card slides in from left
        const cardOpacity = interpolate(adj, [4, 22], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const cardTranslateX = interpolate(adj, [4, 22], [-30, 0], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        // Horizontal connector from dot to card
        const connectorOpacity = interpolate(adj, [2, 16], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const connectorWidth = interpolate(adj, [2, 16], [0, CARD_OFFSET_X - DOT_RADIUS - 10], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <React.Fragment key={event.label}>
            {/* Status dot on timeline */}
            <div
              style={{
                position: "absolute",
                top: eventY - DOT_RADIUS,
                left: TIMELINE_X - DOT_RADIUS,
                width: DOT_RADIUS * 2,
                height: DOT_RADIUS * 2,
                borderRadius: 999,
                backgroundColor: event.statusColor,
                border: `3px solid ${colors.bgCanvas}`,
                boxShadow: `0 0 0 2px ${event.statusColor}33, 0 2px 6px ${event.statusColor}22`,
                opacity: dotOpacity,
                transform: `scale(${dotScale})`,
              }}
            />

            {/* Horizontal connector */}
            <div
              style={{
                position: "absolute",
                top: eventY - 0.5,
                left: TIMELINE_X + DOT_RADIUS + 4,
                width: connectorWidth,
                height: 1,
                backgroundColor: colors.lineDefault,
                opacity: connectorOpacity,
              }}
            />

            {/* Event card */}
            <div
              style={{
                position: "absolute",
                top: eventY - CARD_H / 2,
                left: TIMELINE_X + CARD_OFFSET_X,
                width: CARD_W,
                height: CARD_H,
                borderRadius: radius.lg,
                background: colors.bgRaised,
                border: `1px solid ${colors.lineDefault}`,
                boxShadow: "0 1px 0 0 rgba(255,255,255,0.8) inset, 0 2px 8px rgba(0,0,0,0.05)",
                display: "flex",
                alignItems: "center",
                padding: "0 24px",
                gap: 16,
                opacity: cardOpacity,
                transform: `translateX(${cardTranslateX}px)`,
              }}
            >
              {/* Left: status indicator dot inside card */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: event.statusColor,
                  flexShrink: 0,
                }}
              />

              {/* Event label */}
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 16,
                  fontWeight: 500,
                  color: colors.fgPrimary,
                  flex: 1,
                }}
              >
                {event.label}
              </span>

              {/* Status badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "4px 12px",
                  borderRadius: radius.full,
                  background: `${event.statusColor}14`,
                  color: event.statusColor,
                  fontFamily: fontFamily.sans,
                  fontSize: 12,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                }}
              >
                {event.statusLabel}
              </span>

              {/* Timestamp */}
              <span
                style={{
                  fontFamily: fontFamily.mono,
                  fontSize: 14,
                  fontWeight: 400,
                  color: colors.fgQuaternary,
                  whiteSpace: "nowrap",
                }}
              >
                {event.time}
              </span>
            </div>
          </React.Fragment>
        );
      })}

      {/* Decorative faded extension of timeline below last event */}
      <FadeIn delay={60} duration={20}>
        <div
          style={{
            position: "absolute",
            top: TIMELINE_TOP + (EVENTS.length - 1) * EVENT_GAP + 20,
            left: TIMELINE_X,
            width: 2,
            height: 60,
            background: `linear-gradient(to bottom, ${colors.lineDefault}, transparent)`,
            borderRadius: 1,
          }}
        />
      </FadeIn>

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
