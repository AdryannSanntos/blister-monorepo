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
import { AnimatedLine } from "@/primitives/animated-line";
import { FadeIn } from "@/primitives/fade-in";

const CAPTION =
  "Templates tornam o bom trabalho repetível. Automações transformam contexto estruturado em execução consistente em escala.";

const entranceEasing = Easing.bezier(0.16, 1, 0.3, 1);

// Template card positions (left half)
const TEMPLATE_MAIN_X = 200;
const TEMPLATE_MAIN_Y = 240;
const TEMPLATE_MAIN_W = 340;
const TEMPLATE_MAIN_H = 200;

// Duplicate template cards
const duplicates = [
  { x: 160, y: 490, w: 220, h: 120 },
  { x: 300, y: 510, w: 220, h: 120 },
  { x: 440, y: 530, w: 220, h: 120 },
];

// Automation nodes (right half)
const AUTO_Y = 380;
const autoNodes = [
  { x: 1080, label: "Gatilho", icon: "⚡", shape: "circle" as const },
  { x: 1320, label: "Contexto", icon: "", shape: "square" as const },
  { x: 1560, label: "Ação", icon: "▶", shape: "circle" as const },
];

export const Scene12Templates: React.FC = () => {
  const frame = useCurrentFrame();

  // Main template card accent bar progress
  const accentBarWidth = interpolate(frame, [8, 30], [0, TEMPLATE_MAIN_W], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Duplicate stagger
  const getDuplicateProps = (index: number) => {
    const delay = 40 + index * 10;
    const adj = frame - delay;

    const opacity = interpolate(adj, [0, 18], [0, 1], {
      easing: entranceEasing,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const scale = interpolate(adj, [0, 18], [0.85, 1], {
      easing: entranceEasing,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const translateY = interpolate(adj, [0, 18], [20, 0], {
      easing: entranceEasing,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return { opacity, scale, translateY };
  };

  // Automation node animation
  const getNodeProps = (index: number) => {
    const delay = 30 + index * 14;
    const adj = frame - delay;

    const opacity = interpolate(adj, [0, 20], [0, 1], {
      easing: entranceEasing,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    const scale = interpolate(adj, [0, 20], [0.7, 1], {
      easing: Easing.bezier(0.34, 1.56, 0.64, 1),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });

    return { opacity, scale };
  };

  // Vertical divider
  const dividerOpacity = interpolate(frame, [5, 25], [0, 0.5], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Section labels
  const labelDelay = 5;
  const labelOpacity = interpolate(frame - labelDelay, [0, 20], [0, 1], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const labelTranslateY = interpolate(frame - labelDelay, [0, 20], [12, 0], {
    easing: entranceEasing,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      {/* Section label: Templates */}
      <div
        style={{
          position: "absolute",
          left: 200,
          top: 140,
          fontFamily: fontFamily.sans,
          fontSize: 14,
          fontWeight: 500,
          color: colors.fgTertiary,
          letterSpacing: 1.5,
          textTransform: "uppercase" as const,
          opacity: labelOpacity,
          transform: `translateY(${labelTranslateY}px)`,
        }}
      >
        Templates
      </div>

      {/* Section label: Automações */}
      <div
        style={{
          position: "absolute",
          left: 1080,
          top: 140,
          fontFamily: fontFamily.sans,
          fontSize: 14,
          fontWeight: 500,
          color: colors.fgTertiary,
          letterSpacing: 1.5,
          textTransform: "uppercase" as const,
          opacity: labelOpacity,
          transform: `translateY(${labelTranslateY}px)`,
        }}
      >
        Automações
      </div>

      {/* Vertical divider */}
      <div
        style={{
          position: "absolute",
          left: 940,
          top: 160,
          width: 1,
          height: 560,
          background: colors.lineDefault,
          opacity: dividerOpacity,
        }}
      />

      {/* Main template card */}
      <div style={{ position: "absolute", left: TEMPLATE_MAIN_X, top: TEMPLATE_MAIN_Y }}>
        <AnimatedCard
          delay={5}
          duration={24}
          width={TEMPLATE_MAIN_W}
          height={TEMPLATE_MAIN_H}
          padding={0}
          borderRadius={radius.xl}
        >
          {/* Accent top border bar */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: accentBarWidth,
              height: 4,
              backgroundColor: colors.accent,
              borderTopLeftRadius: radius.xl,
              borderTopRightRadius: accentBarWidth >= TEMPLATE_MAIN_W ? radius.xl : 0,
            }}
          />
          <div style={{ padding: 28, paddingTop: 32 }}>
            <div
              style={{
                fontFamily: fontFamily.mono,
                fontSize: 11,
                color: colors.fgTertiary,
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              TEMPLATE
            </div>
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 20,
                fontWeight: 500,
                color: colors.fgPrimary,
                marginBottom: 16,
              }}
            >
              Briefing Criativo
            </div>
            {/* Skeleton lines */}
            <div
              style={{
                width: "90%",
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.bgSunken,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                width: "70%",
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.bgSunken,
                marginBottom: 10,
              }}
            />
            <div
              style={{
                width: "50%",
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.bgSunken,
              }}
            />
          </div>
        </AnimatedCard>
      </div>

      {/* Duplicate template cards */}
      {duplicates.map((dup, i) => {
        const { opacity, scale, translateY } = getDuplicateProps(i);
        return (
          <div
            key={`dup-${i}`}
            style={{
              position: "absolute",
              left: dup.x,
              top: dup.y,
              width: dup.w,
              height: dup.h,
              borderRadius: radius.lg,
              background: colors.bgRaised,
              border: `1px solid ${colors.lineDefault}`,
              boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
              opacity,
              transform: `scale(${scale}) translateY(${translateY}px)`,
              padding: 16,
            }}
          >
            <div
              style={{
                width: "100%",
                height: 3,
                backgroundColor: colors.accent,
                borderRadius: 2,
                marginBottom: 12,
                opacity: 0.7,
              }}
            />
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 13,
                fontWeight: 500,
                color: colors.fgSecondary,
                marginBottom: 8,
              }}
            >
              Briefing Criativo
            </div>
            <div
              style={{
                width: "80%",
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.bgSunken,
                marginBottom: 6,
              }}
            />
            <div
              style={{
                width: "55%",
                height: 5,
                borderRadius: 3,
                backgroundColor: colors.bgSunken,
              }}
            />
          </div>
        );
      })}

      {/* Replication arrows from main to duplicates */}
      {duplicates.map((dup, i) => (
        <AnimatedLine
          key={`arrow-${i}`}
          x1={TEMPLATE_MAIN_X + TEMPLATE_MAIN_W / 2}
          y1={TEMPLATE_MAIN_Y + TEMPLATE_MAIN_H}
          x2={dup.x + dup.w / 2}
          y2={dup.y}
          delay={35 + i * 10}
          duration={18}
          color={colors.lineStrong}
          strokeWidth={1.5}
          dashed
        />
      ))}

      {/* Automation flow: connecting lines between nodes */}
      <AnimatedLine
        x1={autoNodes[0].x + 45}
        y1={AUTO_Y}
        x2={autoNodes[1].x - 45}
        y2={AUTO_Y}
        delay={55}
        duration={22}
        color={colors.accent}
        strokeWidth={2}
      />
      <AnimatedLine
        x1={autoNodes[1].x + 45}
        y1={AUTO_Y}
        x2={autoNodes[2].x - 45}
        y2={AUTO_Y}
        delay={75}
        duration={22}
        color={colors.accent}
        strokeWidth={2}
      />

      {/* Arrow heads (small triangles at the end of lines) */}
      {[0, 1].map((lineIdx) => {
        const targetX = lineIdx === 0 ? autoNodes[1].x - 45 : autoNodes[2].x - 45;
        const arrowDelay = lineIdx === 0 ? 70 : 90;
        const adj = frame - arrowDelay;
        const arrowOpacity = interpolate(adj, [0, 10], [0, 1], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <svg
            key={`arrowhead-${lineIdx}`}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "visible",
            }}
          >
            <polygon
              points={`${targetX - 10},${AUTO_Y - 6} ${targetX},${AUTO_Y} ${targetX - 10},${AUTO_Y + 6}`}
              fill={colors.accent}
              opacity={arrowOpacity}
            />
          </svg>
        );
      })}

      {/* Automation nodes */}
      {autoNodes.map((node, i) => {
        const { opacity, scale } = getNodeProps(i);
        const size = 90;

        return (
          <div
            key={node.label}
            style={{
              position: "absolute",
              left: node.x - size / 2,
              top: AUTO_Y - size / 2,
              width: size,
              height: size,
              borderRadius: node.shape === "circle" ? 999 : radius.lg,
              background: colors.bgRaised,
              border: `1.5px solid ${colors.lineDefault}`,
              boxShadow:
                "0 1px 0 0 rgba(255,255,255,0.8) inset, 0 2px 8px rgba(0,0,0,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              opacity,
              transform: `scale(${scale})`,
            }}
          >
            {node.icon && (
              <span style={{ fontSize: 22, lineHeight: 1 }}>{node.icon}</span>
            )}
            <span
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 12,
                fontWeight: 500,
                color: colors.fgSecondary,
              }}
            >
              {node.label}
            </span>
          </div>
        );
      })}

      {/* Node labels below */}
      {autoNodes.map((node, i) => {
        const labelNodeDelay = 50 + i * 14;
        const adj = frame - labelNodeDelay;
        const op = interpolate(adj, [0, 15], [0, 1], {
          easing: entranceEasing,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`label-${node.label}`}
            style={{
              position: "absolute",
              left: node.x - 60,
              top: AUTO_Y + 58,
              width: 120,
              textAlign: "center",
              fontFamily: fontFamily.mono,
              fontSize: 11,
              color: colors.fgTertiary,
              letterSpacing: 0.3,
              opacity: op,
            }}
          >
            {node.label}
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
