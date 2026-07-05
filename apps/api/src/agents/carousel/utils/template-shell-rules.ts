export type TemplateShellRule = {
  /** Variations that hide the progress footer (covers only). */
  coverVariationKeys: string[];
  /** Selectors that must exist in every slide HTML. */
  requiredSelectors: string[];
  /** Header block selector (must exist on every slide). */
  headerSelector: string;
  /** Footer must include progress track on every slide. */
  requiresProgress: boolean;
};

const variationKey = (slideType: string, variationId: string): string =>
  `${slideType}/${variationId}`;

export const TEMPLATE_SHELL_RULES: Record<string, TemplateShellRule> = {
  daylight: {
    coverVariationKeys: [variationKey('start', 'v1')],
    headerSelector: '.day-top',
    requiredSelectors: [
      '.day-top',
      '.day-top__brand',
      '.day-top__index',
      '.day-top__handle',
      '.day-rule',
      '.slide-main',
      '.slide-footer',
      '.progress-track',
      '.progress-fill',
      '.slide-counter',
    ],
    requiresProgress: true,
  },
  reel: {
    coverVariationKeys: [variationKey('start', 'v1')],
    headerSelector: '.reel-top',
    requiredSelectors: [
      '.reel-top',
      '.handle-pill',
      '.reel-no',
      '.slide-main',
      '.slide-footer',
      '.progress-track',
      '.progress-fill',
      '.slide-counter',
    ],
    requiresProgress: true,
  },
  spotlight: {
    coverVariationKeys: [variationKey('start', 'v1')],
    headerSelector: '.slide-header',
    requiredSelectors: [
      '.slide-main',
      '.slide-footer',
      '.progress-track',
      '.progress-fill',
      '.slide-counter',
    ],
    requiresProgress: true,
  },
  voltage: {
    coverVariationKeys: [variationKey('start', 'v1')],
    headerSelector: '.volt-top',
    requiredSelectors: [
      '.volt-top',
      '.handle-pill',
      '.volt-tag',
      '.slide-main',
      '.slide-footer',
      '.progress-track',
      '.progress-fill',
      '.slide-counter',
    ],
    requiresProgress: true,
  },
};

export const isCoverVariation = (
  templateId: string,
  slideType: string,
  variationId: string,
): boolean => {
  const rules = TEMPLATE_SHELL_RULES[templateId];
  if (!rules) return false;
  return rules.coverVariationKeys.includes(variationKey(slideType, variationId));
};

export const resolveSpotlightHeaderSelectors = (
  slideType: string,
  variationId: string,
): string[] => {
  if (isCoverVariation('spotlight', slideType, variationId)) {
    return ['.swipe-bar'];
  }
  return ['.slide-header', '.slide-header__brand', '.slide-header__center', '.slide-header__meta'];
};
