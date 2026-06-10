"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAnyLogoVariant = exports.normalizeBrandAssets = exports.normalizeLogoVariants = exports.brandAssetsSchema = exports.brandAssetSchema = exports.logoVariantsSchema = exports.logoVariantSchema = exports.logoVariantValues = void 0;
const zod_1 = require("zod");
exports.logoVariantValues = [
    'primary',
    'horizontal',
    'icon',
    'monochrome',
];
exports.logoVariantSchema = zod_1.z.enum(exports.logoVariantValues);
exports.logoVariantsSchema = zod_1.z.object({
    primary: zod_1.z.string().nullable().optional(),
    horizontal: zod_1.z.string().nullable().optional(),
    icon: zod_1.z.string().nullable().optional(),
    monochrome: zod_1.z.string().nullable().optional(),
});
exports.brandAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    storageKey: zod_1.z.string(),
    mimeType: zod_1.z.string().optional(),
    createdAt: zod_1.z.string(),
});
exports.brandAssetsSchema = zod_1.z.array(exports.brandAssetSchema);
const normalizeLogoVariants = (value) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return {};
    }
    const record = value;
    const normalized = {};
    for (const variant of exports.logoVariantValues) {
        const key = record[variant];
        if (typeof key === 'string' && key.trim()) {
            normalized[variant] = key.trim();
        }
    }
    return normalized;
};
exports.normalizeLogoVariants = normalizeLogoVariants;
const normalizeBrandAssets = (value) => {
    if (!Array.isArray(value))
        return [];
    return value.flatMap((entry) => {
        const parsed = exports.brandAssetSchema.safeParse(entry);
        return parsed.success ? [parsed.data] : [];
    });
};
exports.normalizeBrandAssets = normalizeBrandAssets;
const hasAnyLogoVariant = (variants, legacyKey) => {
    if (legacyKey?.trim())
        return true;
    return exports.logoVariantValues.some((variant) => Boolean(variants[variant]?.trim()));
};
exports.hasAnyLogoVariant = hasAnyLogoVariant;
