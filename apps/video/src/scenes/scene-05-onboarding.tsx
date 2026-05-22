import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { GridBackground } from "@/primitives/grid-background";
import { fontFamily } from "@/fonts";
import { colors, radius } from "@/tokens";

const CAPTION =
  "O onboarding cria tração desde o início. A empresa entra na plataforma com organização, clareza e uma base pronta para começar a operar com velocidade.";

const STEPS = [
  { label: "Perfil da empresa", copy: "Posicionamento, contexto e prioridades do negócio." },
  { label: "Regras operacionais", copy: "Papéis, políticas e combinações essenciais da operação." },
  { label: "Base inicial", copy: "Primeiros materiais, referências e pontos de partida." },
  { label: "Pronto para executar", copy: "Tudo conectado para começar a produzir com contexto." },
] as const;

export const Scene05Onboarding: React.FC = () => {
  const frame = useCurrentFrame();
  const progressWidth = interpolate(frame, [18, 120], [0, 1180], {
    easing: Easing.bezier(0.22, 1, 0.36, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={72} color={colors.lineSubtle} delay={0} fadeDuration={24} />

      <div
        style={{
          position: "absolute",
          top: 110,
          left: 150,
          right: 150,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 18,
            color: colors.fgQuaternary,
            letterSpacing: 2,
            textTransform: "uppercase",
            marginBottom: 18,
          }}
        >
          Onboarding
        </div>
        <div
          style={{
            fontFamily: fontFamily.serif,
            fontSize: 68,
            lineHeight: 1.05,
            color: colors.fgPrimary,
            letterSpacing: -1.1,
          }}
        >
          A entrada da empresa
          <br />
          já nasce com direção operacional
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 350,
          width: 1180,
          height: 6,
          transform: "translateX(-50%)",
          borderRadius: radius.full,
          background: colors.lineSubtle,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: progressWidth,
            height: "100%",
            borderRadius: radius.full,
            background: colors.accent,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 390,
          width: 1360,
          transform: "translateX(-50%)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 26,
        }}
      >
        {STEPS.map((step, index) => {
          const delay = 12 + index * 10;
          const adjusted = frame - delay;
          const opacity = interpolate(adjusted, [0, 20], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const active = frame > 28 + index * 22;

          return (
            <div
              key={step.label}
              style={{
                padding: "24px 24px 28px",
                borderRadius: radius.xl,
                background: colors.bgRaised,
                border: `1px solid ${active ? colors.accent : colors.lineDefault}`,
                boxShadow: active
                  ? `0 0 0 4px ${colors.accentSoft}, 0 18px 36px rgba(0,0,0,0.16)`
                  : `0 12px 28px rgba(0,0,0,0.14)`,
                opacity,
                minHeight: 250,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 999,
                  background: active ? colors.accent : colors.bgOverlay,
                  color: active ? colors.fgOnAccent : colors.fgSecondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: fontFamily.mono,
                  fontSize: 22,
                  fontWeight: 500,
                  marginBottom: 22,
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  color: colors.fgPrimary,
                  letterSpacing: -0.4,
                  marginBottom: 14,
                }}
              >
                {step.label}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 20,
                  lineHeight: 1.45,
                  color: colors.fgSecondary,
                }}
              >
                {step.copy}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          position: "absolute",
          top: 700,
          left: "50%",
          transform: "translateX(-50%)",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 18px",
          borderRadius: radius.full,
          background: colors.successSoft,
          color: colors.success,
          fontFamily: fontFamily.sans,
          fontSize: 20,
          fontWeight: 500,
          opacity: interpolate(frame, [110, 132], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          }),
        }}
      >
        Empresa pronta para começar a operar
      </div>

      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 86,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1360,
            textAlign: "center",
            fontFamily: fontFamily.sans,
            fontSize: 26,
            lineHeight: 1.45,
            color: colors.fgTertiary,
          }}
        >
          {CAPTION}
        </div>
      </div>
    </AbsoluteFill>
  );
};
