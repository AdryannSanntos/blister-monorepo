type DesignPlanSlide = {
  index: number;
  role: string;
  headline: string;
  supportingText?: string;
  compositionLayout: string;
  backgroundTreatment: string;
  cta?: string;
  visualElements?: string[];
};

export type DesignPlanPreview = {
  creativeDirection: string;
  brandVisualStyle: string;
  aestheticLanguage: string;
  compositionSystem: string;
  brandPresence: string;
  typography: {
    primaryFont: string;
    headlineScale?: string;
    bodyScale?: string;
    rules: string;
  };
  colorStrategy: {
    backgroundType: string;
    primaryBackground: string;
    textColor: string;
    accentColor?: string;
    useGradient: boolean;
    gradientRationale?: string;
  };
  slides: DesignPlanSlide[];
  guardrails?: string[];
  qualityChecklist?: string[];
};

const ROLE_LABELS: Record<string, string> = {
  cover: "Capa",
  content: "Conteúdo",
  proof: "Prova",
  cta: "Chamada",
  closing: "Fechamento",
};

const BACKGROUND_LABELS: Record<string, string> = {
  solid: "Cor sólida",
  subtle_texture: "Textura sutil",
  photo_overlay: "Foto com overlay",
  editorial_clean: "Fundo limpo",
  geometric_pattern: "Padrão geométrico",
};

const BRAND_PRESENCE_LABELS: Record<string, string> = {
  protagonist: "Protagonista",
  signature: "Assinatura",
  subtle: "Sutil",
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

    const visualElements = Array.isArray(item.visualElements)
      ? item.visualElements.filter((entry): entry is string => typeof entry === "string")
      : undefined;

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
      visualElements,
    });
  }

  if (slides.length === 0) return null;

  const guardrails = Array.isArray(record.guardrails)
    ? record.guardrails.filter((entry): entry is string => typeof entry === "string")
    : undefined;
  const qualityChecklist = Array.isArray(record.qualityChecklist)
    ? record.qualityChecklist.filter((entry): entry is string => typeof entry === "string")
    : undefined;

  return {
    creativeDirection,
    brandVisualStyle:
      typeof record.brandVisualStyle === "string" ? record.brandVisualStyle : "",
    aestheticLanguage:
      typeof record.aestheticLanguage === "string" ? record.aestheticLanguage : "",
    compositionSystem:
      typeof record.compositionSystem === "string" ? record.compositionSystem : "",
    brandPresence: typeof record.brandPresence === "string" ? record.brandPresence : "",
    typography: {
      primaryFont:
        typeof typography.primaryFont === "string" ? typography.primaryFont : "",
      headlineScale:
        typeof typography.headlineScale === "string" ? typography.headlineScale : undefined,
      bodyScale:
        typeof typography.bodyScale === "string" ? typography.bodyScale : undefined,
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
      accentColor:
        typeof colorStrategy.accentColor === "string"
          ? colorStrategy.accentColor
          : undefined,
      useGradient: colorStrategy.useGradient === true,
      gradientRationale:
        typeof colorStrategy.gradientRationale === "string"
          ? colorStrategy.gradientRationale
          : undefined,
    },
    slides,
    guardrails,
    qualityChecklist,
  };
};

export const formatDesignPlanPreviewMarkdown = (plan: DesignPlanPreview): string => {
  const backgroundLabel =
    BACKGROUND_LABELS[plan.colorStrategy.backgroundType] ??
    plan.colorStrategy.backgroundType;
  const brandPresenceLabel =
    BRAND_PRESENCE_LABELS[plan.brandPresence] ?? plan.brandPresence;

  const slideLines = plan.slides
    .map((slide) => {
      const role = ROLE_LABELS[slide.role] ?? slide.role;
      const lines = [
        `#### Slide ${slide.index} · ${role}`,
        `- **Headline:** ${slide.headline}`,
        slide.supportingText ? `- **Apoio:** ${slide.supportingText}` : null,
        slide.compositionLayout ? `- **Layout:** ${slide.compositionLayout}` : null,
        slide.backgroundTreatment ? `- **Fundo:** ${slide.backgroundTreatment}` : null,
        slide.visualElements && slide.visualElements.length > 0
          ? `- **Elementos:** ${slide.visualElements.join(", ")}`
          : null,
        slide.cta ? `- **CTA:** ${slide.cta}` : null,
      ].filter(Boolean);

      return lines.join("\n");
    })
    .join("\n\n");

  const gradientLine = plan.colorStrategy.useGradient
    ? plan.colorStrategy.gradientRationale
      ? `Gradiente permitido: ${plan.colorStrategy.gradientRationale}`
      : "Gradiente permitido conforme plano"
    : "Sem gradiente decorativo";

  const guardrailLines =
    plan.guardrails && plan.guardrails.length > 0
      ? ["**Restrições**", ...plan.guardrails.map((item) => `- ${item}`)].join("\n")
      : null;

  const checklistLines =
    plan.qualityChecklist && plan.qualityChecklist.length > 0
      ? ["**Checklist de qualidade**", ...plan.qualityChecklist.map((item) => `- ${item}`)].join(
          "\n",
        )
      : null;

  return [
    "### Plano de design",
    "",
    "**Direção criativa**",
    plan.creativeDirection,
    "",
    "**Estilo visual da empresa**",
    plan.brandVisualStyle || "—",
    "",
    "**Sistema visual**",
    `- Composição: ${plan.compositionSystem || "—"}`,
    `- Linguagem: ${plan.aestheticLanguage || "—"}`,
    `- Presença da marca: ${brandPresenceLabel || "—"}`,
    "",
    "**Tipografia**",
    `- Fonte: ${plan.typography.primaryFont || "—"}`,
    plan.typography.headlineScale ? `- Headline: ${plan.typography.headlineScale}` : null,
    plan.typography.bodyScale ? `- Corpo: ${plan.typography.bodyScale}` : null,
    plan.typography.rules ? `- Regras: ${plan.typography.rules}` : null,
    "",
    "**Cores e fundo**",
    `- Fundo: ${plan.colorStrategy.primaryBackground || "—"} (${backgroundLabel || "—"})`,
    `- Texto: ${plan.colorStrategy.textColor || "—"}`,
    plan.colorStrategy.accentColor ? `- Destaque: ${plan.colorStrategy.accentColor}` : null,
    `- ${gradientLine}`,
    "",
    "**Slides**",
    slideLines,
    guardrailLines,
    checklistLines,
    "",
    "_Revise o plano e aprove para iniciar a montagem do post._",
  ]
    .filter(Boolean)
    .join("\n");
};

export const getDesignPlanStepHint = (stepKey: string | null | undefined): string | null => {
  switch (stepKey) {
    case "plan_design":
      return "Definindo direção criativa com base no Cérebro da Marca e no briefing…";
    case "approve_design_plan":
      return "Aguardando sua aprovação do plano de design…";
    case "generate_post":
      return "Montando os slides em HTML com a identidade da marca…";
    default:
      return null;
  }
};
