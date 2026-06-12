"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBrandBrainStatusTone = exports.getBrandBrainProgressTone = exports.calculateBrandBrainProgress = exports.BRAND_BRAIN_TAB_VALUES = void 0;
const brand_palette_1 = require("./brand-palette");
const brand_visual_1 = require("./brand-visual");
exports.BRAND_BRAIN_TAB_VALUES = [
    'visual',
    'business',
    'audience',
    'voice',
    'social',
    'offer',
];
const hasText = (value, min = 1) => (value?.trim().length ?? 0) >= min;
const toSectionProgress = (tab, checks) => {
    const total = checks.length;
    const filled = checks.filter(Boolean).length;
    return {
        tab,
        filled,
        total,
        percent: total === 0 ? 0 : Math.round((filled / total) * 100),
    };
};
const calculateBrandBrainProgress = (input) => {
    const palette = (0, brand_palette_1.normalizeBrandPalette)(input.palette);
    const defaults = (0, brand_palette_1.createDefaultBrandPalette)();
    const logoVariants = (0, brand_visual_1.normalizeLogoVariants)(input.logoVariants);
    const sections = {
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
            (0, brand_visual_1.hasAnyLogoVariant)(logoVariants, input.logoStorageKey),
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
    const filled = Object.values(sections).reduce((sum, section) => sum + section.filled, 0);
    const total = Object.values(sections).reduce((sum, section) => sum + section.total, 0);
    return {
        sections,
        overall: {
            filled,
            total,
            percent: total === 0 ? 0 : Math.round((filled / total) * 100),
        },
    };
};
exports.calculateBrandBrainProgress = calculateBrandBrainProgress;
const getBrandBrainProgressTone = (percent) => {
    if (percent >= 100) {
        return {
            trackColor: 'var(--success-600)',
            badgeBackground: 'var(--success-600)',
            badgeText: '#ffffff',
            tabBackground: 'var(--success-soft)',
            tabBorder: 'color-mix(in srgb, var(--success-600) 35%, var(--line-default))',
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
exports.getBrandBrainProgressTone = getBrandBrainProgressTone;
const getBrandBrainStatusTone = (percent) => {
    if (percent >= 67)
        return 'success';
    if (percent >= 34)
        return 'warning';
    return 'danger';
};
exports.getBrandBrainStatusTone = getBrandBrainStatusTone;
