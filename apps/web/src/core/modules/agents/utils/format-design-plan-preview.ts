type DesignPlanSlide = {
  index: number;
  role: string;
  headline: string;
  supportingText?: string;
  compositionLayout: string;
  backgroundTreatment: string;
  cta?: string;
};

export type DesignPlanPreview = {
  creativeDirection: string;
  aestheticLanguage: string;
  compositionSystem: string;
  brandPresence: string;
  typography: {
    primaryFont: string;
    rules: string;
  };
  colorStrategy: {
    backgroundType: string;
    primaryBackground: string;
    textColor: string;
    useGradient: boolean;
  };
  slides: DesignPlanSlide[];
};

const ROLE_LABELS: Record<string, string> = {
  cover: "Capa",
  content: "Conteúdo",
  proof: "Prova",
  cta: "Chamada",
  closing: "Fechamento",
};

export const parseDesignPlanPreview = (value: unknown): DesignPlanPreview | null => {
  if (typeof value !== "object" || value === null) return null;

  const record = value as Record<string, unknown>;
  const creativeDirection =
    typeof record.creativeDirection === "string" ? record.creativeDirection.trim() : "";
  if (!creativeDirection) return null;

  const typography =
    typeof record.typography === "object" && record.typography !== null
      ? (record.typography as Record<string, unknown>)
      : {};
  const colorStrategy =
    typeof record.colorStrategy === "object" && record.colorStrategy !== null
      ? (record.colorStrategy as Record<string, unknown>)
      : {};
  const slidesRaw = Array.isArray(record.slides) ? record.slides : [];

  const slides: DesignPlanSlide[] = [];

  for (const slide of slidesRaw) {
    if (typeof slide !== "object" || slide === null) continue;
    const item = slide as Record<string, unknown>;
    const headline = typeof item.headline === "string" ? item.headline.trim() : "";
    if (!headline) continue;

    slides.push({
      index: typeof item.index === "number" ? item.index : slides.length + 1,
      role: typeof item.role === "string" ? item.role : "content",
      headline,
      supportingText:
        typeof item.supportingText === "string" ? item.supportingText : undefined,
      compositionLayout:
        typeof item.compositionLayout === "string" ? item.compositionLayout : "",
      backgroundTreatment:
        typeof item.backgroundTreatment === "string" ? item.backgroundTreatment : "",
      cta: typeof item.cta === "string" ? item.cta : undefined,
    });
  }

  if (slides.length === 0) return null;

  return {
    creativeDirection,
    aestheticLanguage:
      typeof record.aestheticLanguage === "string" ? record.aestheticLanguage : "",
    compositionSystem:
      typeof record.compositionSystem === "string" ? record.compositionSystem : "",
    brandPresence: typeof record.brandPresence === "string" ? record.brandPresence : "",
    typography: {
      primaryFont:
        typeof typography.primaryFont === "string" ? typography.primaryFont : "",
      rules: typeof typography.rules === "string" ? typography.rules : "",
    },
    colorStrategy: {
      backgroundType:
        typeof colorStrategy.backgroundType === "string"
          ? colorStrategy.backgroundType
          : "",
      primaryBackground:
        typeof colorStrategy.primaryBackground === "string"
          ? colorStrategy.primaryBackground
          : "",
      textColor:
        typeof colorStrategy.textColor === "string" ? colorStrategy.textColor : "",
      useGradient: colorStrategy.useGradient === true,
    },
    slides,
  };
};

export const formatDesignPlanPreviewMarkdown = (plan: DesignPlanPreview): string => {
  const slideLines = plan.slides
    .map((slide) => {
      const role = ROLE_LABELS[slide.role] ?? slide.role;
      const lines = [
        `**Slide ${slide.index} · ${role}**`,
        `- Headline: ${slide.headline}`,
        slide.supportingText ? `- Apoio: ${slide.supportingText}` : null,
        slide.compositionLayout ? `- Layout: ${slide.compositionLayout}` : null,
        slide.backgroundTreatment ? `- Fundo: ${slide.backgroundTreatment}` : null,
        slide.cta ? `- CTA: ${slide.cta}` : null,
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n");

  return [
    "### Plano de design",
    plan.creativeDirection,
    "",
    `**Estética:** ${plan.aestheticLanguage || "—"} · **Composição:** ${plan.compositionSystem || "—"} · **Marca:** ${plan.brandPresence || "—"}`,
    "",
    `**Tipografia:** ${plan.typography.primaryFont || "—"}`,
    plan.typography.rules ? `_${plan.typography.rules}_` : null,
    "",
    `**Cores:** fundo ${plan.colorStrategy.primaryBackground || "—"} · texto ${plan.colorStrategy.textColor || "—"} · tipo ${plan.colorStrategy.backgroundType || "—"}${plan.colorStrategy.useGradient ? " · gradiente permitido" : ""}`,
    "",
    slideLines,
  ]
    .filter(Boolean)
    .join("\n");
};

export const getDesignPlanStepHint = (stepKey: string | null | undefined): string | null => {
  switch (stepKey) {
    case "plan_design":
      return "Definindo direção criativa, paleta, tipografia e composição dos slides…";
    case "generate_post":
      return "Montando os slides em HTML com a identidade da marca…";
    default:
      return null;
  }
};
