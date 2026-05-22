import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import { AnimatedBadge } from "@/primitives/animated-badge";
import { AnimatedLine } from "@/primitives/animated-line";
import { GridBackground } from "@/primitives/grid-background";
import { fontFamily } from "@/fonts";
import { colors, radius } from "@/tokens";

const CAPTION =
  "Equipe, convites, papéis e permissões deixam de ser um detalhe operacional. Passam a fazer parte da estrutura que sustenta a entrega com segurança.";

const MEMBERS = [
  { initials: "AS", name: "Liderança", role: "Owner", color: colors.accent, bg: colors.accentSoft },
  { initials: "ML", name: "Operação", role: "Admin", color: colors.info, bg: colors.infoSoft },
  { initials: "JP", name: "Especialista", role: "Member", color: colors.success, bg: colors.successSoft },
  { initials: "RC", name: "Parceiro", role: "Member", color: colors.warning, bg: colors.warningSoft },
] as const;

const CHIPS = ["Convites organizados", "Funções claras", "Permissões por papel", "Acesso com contexto"] as const;

export const Scene04TeamAccess: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={72} color={colors.lineSubtle} delay={0} fadeDuration={24} />

      <div
        style={{
          position: "absolute",
          top: 32,
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
          Equipe e acesso
        </div>
        <div
          style={{
            fontFamily: fontFamily.serif,
            fontSize: 60,
            lineHeight: 1.05,
            color: colors.fgPrimary,
            letterSpacing: -1.1,
          }}
        >
          Crescer com parceiros externos
          <br />
          exige estrutura desde o primeiro dia
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          top: 300,
          left: "50%",
          width: 1360,
          transform: "translateX(-50%)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        {MEMBERS.map((member, index) => {
          const delay = index * 6;
          const adjusted = frame - delay;
          const opacity = interpolate(adjusted, [0, 18], [0, 1], {
            easing: Easing.bezier(0.16, 1, 0.3, 1),
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div
              key={member.initials}
              style={{
                width: 290,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity,
              }}
            >
              <div
                style={{
                  width: 118,
                  height: 118,
                  borderRadius: 999,
                  background: member.color,
                  border: `1px solid ${colors.lineStrong}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 12px 28px rgba(0,0,0,0.18)`,
                  marginBottom: 18,
                }}
              >
                <span
                  style={{
                    fontFamily: fontFamily.sans,
                    fontSize: 34,
                    fontWeight: 500,
                    color: colors.fgOnAccent,
                  }}
                >
                  {member.initials}
                </span>
              </div>

              <div
                style={{
                  fontFamily: fontFamily.sans,
                  fontSize: 27,
                  fontWeight: 500,
                  color: colors.fgPrimary,
                  marginBottom: 12,
                }}
              >
                {member.name}
              </div>

              <AnimatedBadge
                label={member.role}
                delay={delay + 8}
                duration={16}
                color={member.color}
                background={member.bg}
                fontSize={16}
                style={{ padding: "8px 18px" }}
              />
            </div>
          );
        })}
      </div>

      {[0, 1, 2].map((index) => (
        <AnimatedLine
          key={`member-link-${index}`}
          x1={450 + index * 315}
          y1={475}
          x2={735 + index * 315}
          y2={475}
          delay={16 + index * 4}
          duration={18}
          color={colors.lineDefault}
          strokeWidth={1.5}
        />
      ))}

      <div
        style={{
          position: "absolute",
          bottom: 190,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 18,
          flexWrap: "wrap",
          justifyContent: "center",
          width: 1400,
        }}
      >
        {CHIPS.map((chip, index) => (
          <AnimatedBadge
            key={chip}
            label={chip}
            delay={38 + index * 5}
            duration={16}
            color={colors.fgSecondary}
            background={colors.bgRaised}
            fontSize={17}
            style={{
              padding: "11px 18px",
              border: `1px solid ${colors.lineDefault}`,
            }}
          />
        ))}
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
