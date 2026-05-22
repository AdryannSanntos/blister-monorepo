import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";
import { AnimatedBadge } from "@/primitives/animated-badge";
import { AnimatedLine } from "@/primitives/animated-line";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "Agentes trabalham a favor da operação. Eles usam o contexto da empresa para acelerar entregas, organizar fluxos e ampliar a capacidade do time.";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

// Layout constants
const CENTER_Y = 440;
const INPUT_X = 220;
const AGENT_X = 720;
const AGENT_W = 220;
const AGENT_H = 120;
const STEP_START_X = 1100;
const STEP_GAP = 220;

const INPUTS = [
  { label: "Brain", y: CENTER_Y - 120, color: colors.accent, bg: colors.accentSoft },
  { label: "Materiais", y: CENTER_Y, color: colors.warning, bg: colors.warningSoft },
  { label: "Permissões", y: CENTER_Y + 120, color: colors.warning, bg: colors.warningSoft },
] as const;

const EXECUTION_STEPS = [
  { label: "Demanda", color: colors.accent },
  { label: "Coordenação", color: colors.info },
  { label: "Entrega", color: colors.success },
] as const;

export const Scene08Agents: React.FC = () => {
  const frame = useCurrentFrame();

  // Agent card animation
  const agentDelay = 30;
  const agentAdj = frame - agentDelay;

  const agentOpacity = interpolate(agentAdj, [0, 25], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const agentScale = interpolate(agentAdj, [0, 25], [0.9, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const agentTranslateY = interpolate(agentAdj, [0, 25], [15, 0], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // aiLive glow indicator pulse
  const glowPulse = interpolate(frame, [50, 80, 110, 140, 170], [0, 1, 0.6, 1, 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const aiGlowScale = interpolate(frame, [50, 80, 110, 140, 170], [0.8, 1.2, 1, 1.2, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Input badges on left */}
      {INPUTS.map((input, i) => (
        <div
          key={input.label}
          style={{
            position: "absolute",
            top: input.y - 16,
            left: INPUT_X,
          }}
        >
          <AnimatedBadge
            label={input.label}
            delay={8 + i * 8}
            duration={20}
            color={input.color}
            background={input.bg}
            fontSize={15}
            style={{ padding: "8px 20px" }}
          />
        </div>
      ))}

      {/* Lines from input badges to agent card */}
      {INPUTS.map((input, i) => (
        <AnimatedLine
          key={`line-in-${input.label}`}
          x1={INPUT_X + 130}
          y1={input.y}
          x2={AGENT_X}
          y2={CENTER_Y}
          delay={22 + i * 8}
          duration={20}
          color={colors.lineDefault}
          strokeWidth={1.5}
        />
      ))}

      {/* Agent card — center piece */}
      <div
        style={{
          position: "absolute",
          top: CENTER_Y - AGENT_H / 2,
          left: AGENT_X,
          width: AGENT_W,
          height: AGENT_H,
          borderRadius: radius.xl,
          background: colors.bgRaised,
          border: `2px solid ${colors.accent}`,
          boxShadow: `0 0 0 4px ${colors.accentSoft}, 0 6px 18px ${colors.lineSubtle}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          opacity: agentOpacity,
          transform: `scale(${agentScale}) translateY(${agentTranslateY}px)`,
        }}
      >
        {/* aiLive indicator */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            backgroundColor: colors.aiLive,
            boxShadow: `0 0 0 4px ${colors.successSoft}`,
            opacity: glowPulse,
            transform: `scale(${aiGlowScale})`,
          }}
        />
        <span
            style={{
              fontFamily: fontFamily.sans,
              fontSize: 20,
              fontWeight: 500,
              color: colors.fgPrimary,
              letterSpacing: -0.3,
            }}
        >
          Agente
        </span>
      </div>

      {/* Line from agent to first execution step */}
      <AnimatedLine
        x1={AGENT_X + AGENT_W}
        y1={CENTER_Y}
        x2={STEP_START_X}
        y2={CENTER_Y}
        delay={60}
        duration={18}
        color={colors.lineStrong}
        strokeWidth={2}
      />

      {/* Execution trail steps */}
      {EXECUTION_STEPS.map((step, i) => {
        const stepX = STEP_START_X + i * STEP_GAP;
        const stepDelay = 65 + i * 15;
        const stepAdj = frame - stepDelay;

        const stepOpacity = interpolate(stepAdj, [0, 20], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const stepScale = interpolate(stepAdj, [0, 20], [0.85, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const stepW = 160;
        const stepH = 56;

        return (
          <React.Fragment key={step.label}>
            {/* Connecting line between steps (except first) */}
            {i > 0 && (
              <AnimatedLine
                x1={STEP_START_X + (i - 1) * STEP_GAP + stepW}
                y1={CENTER_Y}
                x2={stepX}
                y2={CENTER_Y}
                delay={stepDelay - 5}
                duration={15}
                color={colors.lineDefault}
                strokeWidth={1.5}
                dashed
              />
            )}

            {/* Step card */}
            <div
              style={{
                position: "absolute",
                top: CENTER_Y - stepH / 2,
                left: stepX,
                width: stepW,
                height: stepH,
                borderRadius: radius.lg,
                background: colors.bgRaised,
                border: `1.5px solid ${colors.lineDefault}`,
                boxShadow: `0 4px 12px ${colors.lineSubtle}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                opacity: stepOpacity,
                transform: `scale(${stepScale})`,
              }}
            >
              {/* Step dot */}
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 999,
                  backgroundColor: step.color,
                }}
              />
              <span
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 14,
                  fontWeight: 500,
                  color: colors.fgSecondary,
                }}
              >
                {step.label}
              </span>
            </div>

            {/* Arrow head on last step */}
            {i === EXECUTION_STEPS.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  top: CENTER_Y - 5,
                  left: stepX + stepW + 8,
                  width: 0,
                  height: 0,
                  borderTop: "5px solid transparent",
                  borderBottom: "5px solid transparent",
                  borderLeft: `8px solid ${colors.success}`,
                  opacity: stepOpacity,
                }}
              />
            )}
          </React.Fragment>
        );
      })}

      {/* Decorative horizontal line across the bottom of the flow */}
      <FadeIn delay={50} duration={30}>
        <div
          style={{
            position: "absolute",
            top: CENTER_Y + 90,
            left: INPUT_X,
            width: STEP_START_X + 2 * STEP_GAP + 160 - INPUT_X,
            height: 1,
            background: `linear-gradient(to right, transparent, ${colors.lineSubtle} 20%, ${colors.lineSubtle} 80%, transparent)`,
          }}
        />
      </FadeIn>

      {/* Flow label */}
      <FadeIn delay={55} duration={20}>
        <div
          style={{
            position: "absolute",
            top: CENTER_Y + 100,
            left: AGENT_X + AGENT_W / 2,
            transform: "translateX(-50%)",
          }}
        >
          <span
            style={{
              fontFamily: fontFamily.mono,
              fontSize: 12,
              fontWeight: 400,
              color: colors.fgQuaternary,
              letterSpacing: 0.8,
            }}
          >
            FLUXO DE ENTREGA
          </span>
        </div>
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
