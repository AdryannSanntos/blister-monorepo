import type { CarouselBrandContext } from '@company-os/types';

const DEFAULT_ACCENT_HEXES = [
  '#ff4a0a',
  '#FF4A0A',
  '#f54a0a',
  '#F54A0A',
  '#ff5a1a',
  '#FF5A1A',
  '#f6ddd4',
] as const;

const parseHex = (hex: string): { r: number; g: number; b: number } | null => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
};

const toHex = (r: number, g: number, b: number): string =>
  `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();

const lightenHex = (hex: string, amount: number): string => {
  const rgb = parseHex(hex);
  if (!rgb) return hex.toUpperCase();
  return toHex(
    Math.min(255, rgb.r + amount),
    Math.min(255, rgb.g + amount),
    Math.min(255, rgb.b + amount),
  );
};

const softenBorderHex = (hex: string): string => {
  const rgb = parseHex(hex);
  if (!rgb) return '#F6DDD4';
  return toHex(
    Math.min(255, Math.round(rgb.r + (255 - rgb.r) * 0.72)),
    Math.min(255, Math.round(rgb.g + (255 - rgb.g) * 0.72)),
    Math.min(255, Math.round(rgb.b + (255 - rgb.b) * 0.72)),
  );
};

export const buildAccentCssOverride = (accentColor: string): string => {
  const accent = accentColor.toUpperCase();
  const accentSoft = lightenHex(accent, 18);
  const sectionFrom = accent;
  const sectionTo = lightenHex(accent, 28);

  return `:root {
  --accent: ${accent};
  --accent-soft: ${accentSoft};
  --section-orange-from: ${sectionFrom};
  --section-orange-to: ${sectionTo};
}`;
};

export const applyBrandThemeToCss = (css: string, accentColor: string): string => {
  const accent = accentColor.toUpperCase();
  const accentSoft = lightenHex(accent, 18);
  const sectionFrom = accent;
  const sectionTo = lightenHex(accent, 28);
  const borderSoft = softenBorderHex(accent);

  let result = css;
  for (const legacyHex of DEFAULT_ACCENT_HEXES) {
    const pattern = new RegExp(legacyHex.replace('#', '#'), 'gi');
    const replacement =
      legacyHex.toLowerCase() === '#f6ddd4'
        ? borderSoft
        : legacyHex.toLowerCase().includes('5a1a')
          ? accentSoft
          : legacyHex.toLowerCase().includes('f54a0a')
            ? sectionFrom
            : accent;
    result = result.replace(pattern, replacement);
  }

  return result;
};

export const assembleSlideCss = (input: {
  baseCss?: string;
  slideCss: string;
  brand: CarouselBrandContext;
}): string => {
  const themedBase = input.baseCss
    ? applyBrandThemeToCss(input.baseCss, input.brand.accentColor)
    : '';
  const themedSlide = applyBrandThemeToCss(input.slideCss, input.brand.accentColor);
  const accentOverride = buildAccentCssOverride(input.brand.accentColor);

  return [themedBase, themedSlide, accentOverride].filter(Boolean).join('\n');
};
