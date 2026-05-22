import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "@/fonts";
import { GridBackground } from "@/primitives/grid-background";
import { colors, radius } from "@/tokens";

const CAPTION =
  "Com o Workana AI, a empresa passa a operar a partir de um workspace central. Tudo o que sustenta a execução vive em um lugar só, com contexto, estrutura e governança.";

const MODULES = [
  { label: "Contexto da empresa", meta: "Diretrizes, posicionamento e prioridades", color: colors.accent, x: 150, y: 190 },
  { label: "Equipe e acessos", meta: "Quem entra, o que pode ver e como atua", color: colors.info, x: 865, y: 190 },
  { label: "Materiais e referências", meta: "Documentos, identidade visual e insumos organizados", color: colors.warning, x: 150, y: 350 },
  { label: "Execução e histórico", meta: "Tudo o que foi feito, entregue e acompanhado", color: colors.success, x: 865, y: 350 },
] as const;

export const Scene03CompanyContainer: React.FC = () => {
  const frame = useCurrentFrame();
  const shellOpacity = interpolate(frame, [0, 24], [0, 1], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={72} color={colors.lineSubtle} delay={0} fadeDuration={24} />

      <div
        style={{
          position: "absolute",
          top: 48,
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
          A solução
        </div>
        <div
          style={{
            fontFamily: fontFamily.serif,
            fontSize: 62,
            lineHeight: 1.05,
            color: colors.fgPrimary,
            letterSpacing: -1.3,
          }}
        >
          Um workspace da empresa
          <br />
          para organizar toda a operação
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 150,
          top: 280,
          width: 1620,
          height: 500,
          borderRadius: 28,
          background: `linear-gradient(180deg, ${colors.bgOverlay}, ${colors.bgBase})`,
          border: `1px solid ${colors.lineDefault}`,
          boxShadow: `0 26px 60px rgba(0,0,0,0.2)`,
          opacity: shellOpacity,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 34px",
            borderBottom: `1px solid ${colors.lineSubtle}`,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 17,
                color: colors.fgQuaternary,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Workspace da empresa
            </div>
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 34,
                fontWeight: 500,
                color: colors.fgPrimary,
                letterSpacing: -0.5,
              }}
            >
              Onde contexto, equipe, materiais e execução passam a conversar
            </div>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 16px",
              borderRadius: radius.full,
              background: colors.accentSoft,
              color: colors.accent,
              fontFamily: fontFamily.sans,
              fontSize: 18,
              fontWeight: 500,
            }}
          >
            Operação centralizada
          </div>
        </div>

        {MODULES.map((module, index) => {
          const appear = frame - (10 + index * 6);
          const opacity = interpolate(appear, [0, 18], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={module.label}
              style={{
                position: "absolute",
                left: module.x,
                top: module.y,
                width: 600,
                minHeight: 122,
                padding: "22px 24px",
                borderRadius: radius.xl,
                background: colors.bgRaised,
                border: `1px solid ${colors.lineDefault}`,
                boxShadow: `0 14px 34px rgba(0,0,0,0.16)`,
                opacity,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 4,
                  borderRadius: radius.full,
                  background: module.color,
                  marginBottom: 18,
                }}
              />
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 26,
                  fontWeight: 500,
                  color: colors.fgPrimary,
                  letterSpacing: -0.4,
                  marginBottom: 12,
                }}
              >
                {module.label}
              </div>
              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 18,
                  lineHeight: 1.45,
                  color: colors.fgSecondary,
                }}
              >
                {module.meta}
              </div>
            </div>
          );
        })}
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
