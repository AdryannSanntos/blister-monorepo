import {
  createDefaultBrandPalette,
  normalizeBrandPalette,
} from './brand-palette';
import { hasAnyLogoVariant, normalizeLogoVariants } from './brand-visual';

export const BRAND_BRAIN_TAB_VALUES = [
  'visual',
  'business',
  'audience',
  'voice',
  'social',
  'offer',
] as const;

export type BrandBrainTab = (typeof BRAND_BRAIN_TAB_VALUES)[number];

export type BrandBrainSectionProgress = {
  tab: BrandBrainTab;
  filled: number;
  total: number;
  percent: number;
};

export type BrandBrainProgress = {
  sections: Record<BrandBrainTab, BrandBrainSectionProgress>;
  overall: {
    filled: number;
    total: number;
    percent: number;
  };
};

export type BrandBrainProgressInput = {
  companyName: string;
  logoStorageKey: string | null;
  logoVariants?: unknown;
  brandVoice: string;
  niche: string | null;
  description: string | null;
  targetAudience: string | null;
  marketingObjective: string | null;
  socialNetworks: string[];
  palette: unknown;
  visualStyle: string | null;
  typography: string | null;
  mainProducts: string | null;
  differentiators: string | null;
};

const hasText = (value: string | null | undefined, min = 1) =>
  (value?.trim().length ?? 0) >= min;

const toSectionProgress = (
  tab: BrandBrainTab,
  checks: boolean[],
): BrandBrainSectionProgress => {
  const total = checks.length;
  const filled = checks.filter(Boolean).length;

  return {
    tab,
    filled,
    total,
    percent: total === 0 ? 0 : Math.round((filled / total) * 100),
  };
};

export const calculateBrandBrainProgress = (
  input: BrandBrainProgressInput,
): BrandBrainProgress => {
  const palette = normalizeBrandPalette(input.palette);
  const defaults = createDefaultBrandPalette();
  const logoVariants = normalizeLogoVariants(input.logoVariants);

  const sections: Record<BrandBrainTab, BrandBrainSectionProgress> = {
    business: toSectionProgress('business', [
      hasText(input.companyName, 2),
      hasText(input.niche, 2),
      hasText(input.description, 10),
    ]),
    audience: toSectionProgress('audience', [
      hasText(input.targetAudience),
      Boolean(input.marketingObjective),
    ]),
    voice: toSectionProgress('voice', [hasText(input.brandVoice, 10)]),
    social: toSectionProgress('social', [input.socialNetworks.length > 0]),
    visual: toSectionProgress('visual', [
      hasAnyLogoVariant(logoVariants, input.logoStorageKey),
      palette.primary.hex.toUpperCase() !== defaults.primary.hex.toUpperCase() ||
        hasText(palette.primary.description),
      palette.secondary.hex.toUpperCase() !== defaults.secondary.hex.toUpperCase() ||
        hasText(palette.secondary.description),
      hasText(input.visualStyle),
      hasText(input.typography),
      ...palette.additional.map((entry) => hasText(entry.name)),
    ]),
    offer: toSectionProgress('offer', [
      hasText(input.mainProducts),
      hasText(input.differentiators),
    ]),
  };

  const filled = Object.values(sections).reduce(
    (sum, section) => sum + section.filled,
    0,
  );
  const total = Object.values(sections).reduce(
    (sum, section) => sum + section.total,
    0,
  );

  return {
    sections,
    overall: {
      filled,
      total,
      percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    },
  };
};

export type BrandBrainProgressTone = {
  trackColor: string;
  badgeBackground: string;
  badgeText: string;
  tabBackground: string;
  tabBorder: string;
  isComplete: boolean;
};

export const getBrandBrainProgressTone = (
  percent: number,
): BrandBrainProgressTone => {
  if (percent >= 100) {
    return {
      trackColor: 'var(--success-600)',
      badgeBackground: 'var(--success-600)',
      badgeText: '#ffffff',
      tabBackground: 'var(--success-soft)',
      tabBorder:
        'color-mix(in srgb, var(--success-600) 35%, var(--line-default))',
      isComplete: true,
    };
  }

  if (percent >= 67) {
    return {
      trackColor: 'var(--success-600)',
      badgeBackground: 'var(--success-600)',
      badgeText: '#ffffff',
      tabBackground: 'var(--success-soft)',
      tabBorder: 'color-mix(in srgb, var(--success-600) 35%, var(--line-default))',
      isComplete: false,
    };
  }

  if (percent >= 34) {
    return {
      trackColor: 'var(--warning-600)',
      badgeBackground: 'var(--warning-600)',
      badgeText: 'var(--warning-900)',
      tabBackground: 'var(--warning-soft)',
      tabBorder: 'color-mix(in srgb, var(--warning-600) 40%, var(--line-default))',
      isComplete: false,
    };
  }

  return {
    trackColor: 'var(--error-500)',
    badgeBackground: 'var(--error-500)',
    badgeText: '#ffffff',
    tabBackground: 'var(--danger-soft)',
    tabBorder: 'color-mix(in srgb, var(--error-500) 35%, var(--line-default))',
    isComplete: false,
  };
};

export type BrandBrainStatusTone = 'success' | 'warning' | 'danger';

export const getBrandBrainStatusTone = (
  percent: number,
): BrandBrainStatusTone => {
  if (percent >= 67) return 'success';
  if (percent >= 34) return 'warning';
  return 'danger';
};
