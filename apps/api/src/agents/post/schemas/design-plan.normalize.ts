import { type PostDesignPlan, postDesignPlanZod, postSlidePlanZod } from './design-plan.schema';

const AESTHETIC_LANGUAGE_ALIASES: Record<string, PostDesignPlan['aestheticLanguage']> = {
  minimalista: 'minimalista',
  minimalist: 'minimalista',
  minimal: 'minimalista',
  editorial: 'editorial',
  bold: 'bold',
  premium: 'premium',
  tech: 'tech',
  tecnologico: 'tech',
  institucional: 'institucional',
  institutional: 'institucional',
  vibrante: 'vibrante',
  vibrant: 'vibrante',
  clean: 'clean',
  limpo: 'clean',
  geometrica: 'geometrica',
  geometric: 'geometrica',
  tipografica: 'tipografica',
  typographic: 'tipografica',
  comercial: 'comercial',
  commercial: 'comercial',
  contemporanea: 'contemporanea',
  contemporary: 'contemporanea',
};

const BACKGROUND_TYPE_ALIASES: Record<string, PostDesignPlan['colorStrategy']['backgroundType']> = {
  solid: 'solid',
  solido: 'solid',
  'cor sólida': 'solid',
  subtle_texture: 'subtle_texture',
  textura_sutil: 'subtle_texture',
  photo_overlay: 'photo_overlay',
  foto_overlay: 'photo_overlay',
  editorial_clean: 'editorial_clean',
  editorial: 'editorial_clean',
  geometric_pattern: 'geometric_pattern',
  pattern: 'geometric_pattern',
};

const SLIDE_ROLE_ALIASES: Record<string, PostDesignPlan['slides'][number]['role']> = {
  cover: 'cover',
  capa: 'cover',
  content: 'content',
  conteudo: 'content',
  proof: 'proof',
  prova: 'proof',
  cta: 'cta',
  closing: 'closing',
  fechamento: 'closing',
};

const BRAND_PRESENCE_ALIASES: Record<string, PostDesignPlan['brandPresence']> = {
  protagonist: 'protagonist',
  protagonista: 'protagonist',
  signature: 'signature',
  assinatura: 'signature',
  subtle: 'subtle',
  sutil: 'subtle',
};

const coerceString = (value: unknown, fallback = ''): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

const coerceStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => coerceString(item)).filter((item) => item.length > 0);
};

const pickEnum = <T extends string>(value: unknown, aliases: Record<string, T>, fallback: T): T => {
  const normalized = coerceString(value).toLowerCase();
  return aliases[normalized] ?? fallback;
};

const normalizeSlide = (slide: unknown, index: number): PostDesignPlan['slides'][number] | null => {
  if (typeof slide !== 'object' || slide === null) return null;

  const record = slide as Record<string, unknown>;
  const headline = coerceString(record.headline);
  const compositionLayout = coerceString(
    record.compositionLayout,
    'Composição tipográfica centralizada',
  );
  const backgroundTreatment = coerceString(
    record.backgroundTreatment,
    'Fundo sólido da paleta da marca',
  );

  if (!headline) return null;

  const parsed = postSlidePlanZod.safeParse({
    index: typeof record.index === 'number' ? record.index : index + 1,
    role: pickEnum(record.role, SLIDE_ROLE_ALIASES, index === 0 ? 'cover' : 'content'),
    headline,
    supportingText: coerceString(record.supportingText) || undefined,
    compositionLayout,
    backgroundTreatment,
    cta: coerceString(record.cta) || undefined,
    visualElements: coerceStringArray(record.visualElements).slice(0, 8),
    safeAreaNotes: coerceString(record.safeAreaNotes) || undefined,
  });

  return parsed.success ? parsed.data : null;
};

export type NormalizeDesignPlanOptions = {
  brandVisualStyle?: string;
};

/**
 * Best-effort normalization so minor schema slips from the model do not fail the
 * whole planning step.
 */
export const normalizeDesignPlanInput = (
  raw: Record<string, unknown>,
  expectedSlides: number,
  options: NormalizeDesignPlanOptions = {},
): PostDesignPlan | null => {
  const brandStyleFallback =
    options.brandVisualStyle?.trim() ||
    coerceString(raw.brandVisualStyle) ||
    'Estilo visual alinhado ao Cérebro da Marca e ao briefing do usuário.';
  const slidesRaw = Array.isArray(raw.slides) ? raw.slides : [];
  const slides = slidesRaw
    .map((slide, index) => normalizeSlide(slide, index))
    .filter((slide): slide is PostDesignPlan['slides'][number] => Boolean(slide))
    .slice(0, expectedSlides);

  if (slides.length === 0) return null;

  while (slides.length < expectedSlides) {
    const last = slides[slides.length - 1];
    slides.push({
      ...last,
      index: slides.length + 1,
      role: slides.length === expectedSlides - 1 ? 'closing' : 'content',
    });
  }

  const typographyRaw =
    typeof raw.typography === 'object' && raw.typography !== null
      ? (raw.typography as Record<string, unknown>)
      : {};

  const colorRaw =
    typeof raw.colorStrategy === 'object' && raw.colorStrategy !== null
      ? (raw.colorStrategy as Record<string, unknown>)
      : {};

  const guardrails = coerceStringArray(raw.guardrails);
  const qualityChecklist = coerceStringArray(raw.qualityChecklist);

  const candidate = {
    creativeDirection: coerceString(
      raw.creativeDirection,
      `Composição alinhada ao estilo da marca: ${brandStyleFallback}`,
    ),
    brandVisualStyle: coerceString(raw.brandVisualStyle, brandStyleFallback),
    aestheticLanguage: pickEnum(raw.aestheticLanguage, AESTHETIC_LANGUAGE_ALIASES, 'clean'),
    compositionSystem: coerceString(
      raw.compositionSystem,
      'Sistema de composição derivado do estilo visual da marca e do objetivo do post.',
    ),
    brandPresence: pickEnum(raw.brandPresence, BRAND_PRESENCE_ALIASES, 'signature'),
    typography: {
      primaryFont: coerceString(typographyRaw.primaryFont, 'Marca'),
      secondaryFont: coerceString(typographyRaw.secondaryFont) || undefined,
      headlineScale: coerceString(typographyRaw.headlineScale, 'Grande'),
      bodyScale: coerceString(typographyRaw.bodyScale, 'Médio'),
      rules: coerceString(
        typographyRaw.rules,
        'Usar somente a tipografia da marca em todos os slides.',
      ),
    },
    colorStrategy: {
      backgroundType: pickEnum(colorRaw.backgroundType, BACKGROUND_TYPE_ALIASES, 'solid'),
      primaryBackground: coerceString(colorRaw.primaryBackground, '#FFFFFF'),
      textColor: coerceString(colorRaw.textColor, '#111111'),
      accentColor: coerceString(colorRaw.accentColor) || undefined,
      useGradient: colorRaw.useGradient === true,
      gradientRationale: coerceString(colorRaw.gradientRationale) || undefined,
    },
    slides,
    guardrails:
      guardrails.length >= 3
        ? guardrails.slice(0, 12)
        : [
            'Sem gradientes decorativos',
            'Sem fontes genéricas ou aleatórias',
            'Sem fundos aleatórios fora da paleta',
          ],
    qualityChecklist:
      qualityChecklist.length >= 4
        ? qualityChecklist.slice(0, 12)
        : ['Hierarquia clara', 'Contraste adequado', 'Área segura respeitada', 'Branding coerente'],
  };

  const parsed = postDesignPlanZod.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};
