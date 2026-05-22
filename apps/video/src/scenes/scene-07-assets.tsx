import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";
import { colors, radius } from "@/tokens";
import { fontFamily } from "@/fonts";
import { FadeIn } from "@/primitives/fade-in";
import { AnimatedLine } from "@/primitives/animated-line";
import { GridBackground } from "@/primitives/grid-background";

const CAPTION =
  "Materiais deixam de ser arquivos soltos. Viram contexto organizado, pronto para orientar entregas com mais consistência.";

const ease = Easing.bezier(0.16, 1, 0.3, 1);

const RAW_FILES = [
  { label: "doc_brief.pdf", y: 220 },
  { label: "logo_v3.png", y: 340 },
  { label: "ref_comp.pdf", y: 460 },
  { label: "proc_onb.docx", y: 580 },
] as const;

const STRUCTURED_CARDS = [
  { label: "Brief", tag: "Briefing", tagColor: colors.accent, tagBg: colors.accentSoft, y: 220 },
  { label: "Identidade Visual", tag: "Visual", tagColor: colors.warning, tagBg: colors.warningSoft, y: 340 },
  { label: "Referências", tag: "Contexto", tagColor: colors.info, tagBg: colors.infoSoft, y: 460 },
  { label: "SOPs", tag: "Processo", tagColor: colors.success, tagBg: colors.successSoft, y: 580 },
] as const;

const LEFT_X = 260;
const MIDDLE_X = 910;
const RIGHT_X = 1560;
const FILE_W = 180;
const FILE_H = 72;
const CARD_W = 260;
const CARD_H = 72;

/** Raw file icon: rectangle with fold corner */
const RawFile: React.FC<{
  label: string;
  x: number;
  y: number;
  delay: number;
}> = ({ label, x, y, delay }) => {
  const frame = useCurrentFrame();
  const adj = frame - delay;

  const opacity = interpolate(adj, [0, 20], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateX = interpolate(adj, [0, 20], [-40, 0], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const foldSize = 16;

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: FILE_W,
        height: FILE_H,
        opacity,
        transform: `translateX(${translateX}px)`,
      }}
    >
      {/* File body */}
      <svg width={FILE_W} height={FILE_H} viewBox={`0 0 ${FILE_W} ${FILE_H}`}>
        <path
          d={`M ${radius.sm} 0 H ${FILE_W - foldSize} L ${FILE_W} ${foldSize} V ${FILE_H - radius.sm} Q ${FILE_W} ${FILE_H} ${FILE_W - radius.sm} ${FILE_H} H ${radius.sm} Q 0 ${FILE_H} 0 ${FILE_H - radius.sm} V ${radius.sm} Q 0 0 ${radius.sm} 0 Z`}
          fill={colors.bgRaised}
          stroke={colors.lineDefault}
          strokeWidth={1.5}
        />
        {/* Fold triangle */}
        <path
          d={`M ${FILE_W - foldSize} 0 V ${foldSize} H ${FILE_W}`}
          fill={colors.bgSunken}
          stroke={colors.lineDefault}
          strokeWidth={1}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: FILE_W,
          height: FILE_H,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: fontFamily.mono,
          fontSize: 13,
          fontWeight: 400,
          color: colors.fgTertiary,
        }}
      >
        {label}
      </span>
    </div>
  );
};

/** Structured card with tag badge */
const StructuredCard: React.FC<{
  label: string;
  tag: string;
  tagColor: string;
  tagBg: string;
  x: number;
  y: number;
  delay: number;
}> = ({ label, tag, tagColor, tagBg, x, y, delay }) => {
  const frame = useCurrentFrame();
  const adj = frame - delay;

  const opacity = interpolate(adj, [0, 22], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const scale = interpolate(adj, [0, 22], [0.92, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = interpolate(adj, [0, 22], [10, 0], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: y,
        left: x,
        width: CARD_W,
        height: CARD_H,
        borderRadius: radius.lg,
        background: colors.bgRaised,
        border: `1.5px solid ${colors.lineDefault}`,
        boxShadow: `0 1px 0 0 ${colors.bgOverlay} inset, 0 4px 12px ${colors.lineSubtle}`,
        display: "flex",
        alignItems: "center",
        padding: "0 18px",
        gap: 12,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
      }}
    >
      {/* Tag badge */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "3px 10px",
          borderRadius: radius.full,
          background: tagBg,
          color: tagColor,
          fontFamily: fontFamily.sans,
          fontSize: 11,
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        {tag}
      </span>
      <span
        style={{
          fontFamily: fontFamily.sans,
          fontSize: 15,
          fontWeight: 500,
          color: colors.fgPrimary,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const Scene07Assets: React.FC = () => {
  const frame = useCurrentFrame();

  // Middle classification zone
  const zoneOpacity = interpolate(frame, [20, 45], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const zoneScaleY = interpolate(frame, [20, 45], [0, 1], {
    easing: ease,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: colors.bgCanvas }}>
      <GridBackground cellSize={80} color={colors.lineSubtle} delay={0} fadeDuration={40} />

      {/* Raw files enter from left */}
      {RAW_FILES.map((file, i) => (
        <RawFile
          key={file.label}
          label={file.label}
          x={LEFT_X - FILE_W / 2}
          y={file.y}
          delay={8 + i * 8}
        />
      ))}

      {/* Arrows from raw files to classification zone */}
      {RAW_FILES.map((file, i) => (
        <AnimatedLine
          key={`arrow-left-${file.label}`}
          x1={LEFT_X + FILE_W / 2 + 16}
          y1={file.y + FILE_H / 2}
          x2={MIDDLE_X - 50}
          y2={file.y + FILE_H / 2}
          delay={25 + i * 8}
          duration={20}
          color={colors.lineStrong}
          strokeWidth={1.5}
          dashed
        />
      ))}

      {/* Classification zone — vertical line with label */}
      <div
        style={{
          position: "absolute",
          top: 190,
          left: MIDDLE_X - 1,
          width: 2,
          height: 440,
          background: colors.accent,
          opacity: zoneOpacity,
          transform: `scaleY(${zoneScaleY})`,
          transformOrigin: "top center",
          borderRadius: 1,
        }}
      />

      {/* "Classificação" label */}
      <div
        style={{
          position: "absolute",
          top: 162,
          left: MIDDLE_X,
          transform: "translateX(-50%)",
          opacity: zoneOpacity,
        }}
      >
        <span
          style={{
            fontFamily: fontFamily.sans,
            fontSize: 13,
            fontWeight: 500,
            color: colors.accent,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Classificação
        </span>
      </div>

      {/* Decorative accent dots along the classification line */}
      {[0, 1, 2, 3].map((idx) => {
        const dotY = 220 + idx * 120 + 36;
        const dotDelay = 40 + idx * 6;

        const dotOpacity = interpolate(frame - dotDelay, [0, 15], [0, 1], {
          easing: ease,
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        const dotScale = interpolate(frame - dotDelay, [0, 15], [0, 1], {
          easing: Easing.bezier(0.34, 1.56, 0.64, 1),
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={`cdot-${idx}`}
            style={{
              position: "absolute",
              top: dotY - 5,
              left: MIDDLE_X - 5,
              width: 10,
              height: 10,
              borderRadius: 999,
              background: colors.accent,
              opacity: dotOpacity,
              transform: `scale(${dotScale})`,
            }}
          />
        );
      })}

      {/* Arrows from classification zone to structured cards */}
      {STRUCTURED_CARDS.map((card, i) => (
        <AnimatedLine
          key={`arrow-right-${card.label}`}
          x1={MIDDLE_X + 50}
          y1={card.y + CARD_H / 2}
          x2={RIGHT_X - CARD_W / 2 - 16}
          y2={card.y + CARD_H / 2}
          delay={55 + i * 8}
          duration={20}
          color={colors.lineStrong}
          strokeWidth={1.5}
          dashed
        />
      ))}

      {/* Structured cards appear on right */}
      {STRUCTURED_CARDS.map((card, i) => (
        <StructuredCard
          key={card.label}
          label={card.label}
          tag={card.tag}
          tagColor={card.tagColor}
          tagBg={card.tagBg}
          x={RIGHT_X - CARD_W / 2}
          y={card.y}
          delay={65 + i * 8}
        />
      ))}

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
