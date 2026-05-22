import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "@/fonts";
import { GridBackground } from "@/primitives/grid-background";
import { colors, radius } from "@/tokens";

const CAPTION =
  "Sem um sistema único, contexto, materiais, equipe e entregas ficam espalhados. O resultado é retrabalho, ruído e pouca previsibilidade para a operação.";

const CARDS = [
  {
    title: "Briefings dispersos",
    copy: "Demandas chegam por diferentes canais, sem padrão e sem histórico confiável.",
    badge: "Contexto",
    color: colors.accent,
    bg: colors.accentSoft,
    x: 150,
    y: 340,
    driftX: -45,
    driftY: -28,
    rotation: -4,
    delay: 2,
  },
  {
    title: "Materiais soltos",
    copy: "Arquivos, referências e diretrizes vivem fora do fluxo principal de trabalho.",
    badge: "Materiais",
    color: colors.warning,
    bg: colors.warningSoft,
    x: 980,
    y: 325,
    driftX: 55,
    driftY: -20,
    rotation: 3,
    delay: 8,
  },
  {
    title: "Acessos sem clareza",
    copy: "Convites, funções e permissões são tratados de forma reativa, e não como parte da operação.",
    badge: "Governança",
    color: colors.info,
    bg: colors.infoSoft,
    x: 230,
    y: 610,
    driftX: -35,
    driftY: 28,
    rotation: -3,
    delay: 14,
  },
  {
    title: "Execução sem trilha",
    copy: "O time entrega, mas a empresa perde visibilidade sobre o que foi feito e por quê.",
    badge: "Histórico",
    color: colors.success,
    bg: colors.successSoft,
    x: 1020,
    y: 600,
    driftX: 48,
    driftY: 32,
    rotation: 4,
    delay: 20,
  },
] as const;

export const Scene02Fragmentation: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={72} color={colors.lineSubtle} delay={0} fadeDuration={24} />

      <div
        style={{
          position: "absolute",
          top: 70,
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
          O problema
        </div>
        <div
          style={{
            fontFamily: fontFamily.serif,
            fontSize: 62,
            lineHeight: 1.06,
            color: colors.fgPrimary,
            letterSpacing: -1.2,
          }}
        >
          Trabalho externo sem contexto
          <br />
          vira operação fragmentada
        </div>
      </div>

      {CARDS.map((card) => {
        const appear = frame - card.delay;
        const drift = interpolate(frame, [40, 130], [0, 1], {
          easing: Easing.bezier(0.45, 0, 0.55, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const opacity = interpolate(appear, [0, 20], [0, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const scale = interpolate(appear, [0, 20], [0.92, 1], {
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={card.title}
            style={{
              position: "absolute",
              left: card.x + card.driftX * drift,
              top: card.y + card.driftY * drift,
              width: 520,
              minHeight: 174,
              padding: "26px 28px",
              borderRadius: radius.xl,
              background: colors.bgRaised,
              border: `1px solid ${colors.lineDefault}`,
              boxShadow: `0 18px 44px rgba(0,0,0,0.18)`,
              opacity,
              transform: `scale(${scale}) rotate(${card.rotation * drift}deg)`,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 14px",
                borderRadius: radius.full,
                background: card.bg,
                color: card.color,
                fontFamily: fontFamily.sans,
                fontSize: 15,
                fontWeight: 500,
                marginBottom: 18,
              }}
            >
              {card.badge}
            </div>
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 28,
                fontWeight: 500,
                color: colors.fgPrimary,
                letterSpacing: -0.5,
                marginBottom: 14,
              }}
            >
              {card.title}
            </div>
            <div
              style={{
                fontFamily: fontFamily.sans,
                fontSize: 19,
                lineHeight: 1.45,
                color: colors.fgSecondary,
              }}
            >
              {card.copy}
            </div>
          </div>
        );
      })}

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
            maxWidth: 1320,
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
