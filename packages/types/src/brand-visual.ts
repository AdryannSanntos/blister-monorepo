import { z } from 'zod';

export const logoVariantValues = [
  'primary',
  'horizontal',
  'icon',
  'monochrome',
] as const;

export const logoVariantSchema = z.enum(logoVariantValues);
export type LogoVariant = z.infer<typeof logoVariantSchema>;

export const logoVariantsSchema = z.object({
  primary: z.string().nullable().optional(),
  horizontal: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  monochrome: z.string().nullable().optional(),
});

export type LogoVariants = z.infer<typeof logoVariantsSchema>;

export const brandAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  storageKey: z.string(),
  mimeType: z.string().optional(),
  createdAt: z.string(),
});

export type BrandAsset = z.infer<typeof brandAssetSchema>;

export const brandAssetsSchema = z.array(brandAssetSchema);

export const normalizeLogoVariants = (value: unknown): LogoVariants => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: LogoVariants = {};

  for (const variant of logoVariantValues) {
    const key = record[variant];
    if (typeof key === 'string' && key.trim()) {
      normalized[variant] = key.trim();
    }
  }

  return normalized;
};

export const normalizeBrandAssets = (value: unknown): BrandAsset[] => {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    const parsed = brandAssetSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
};

export const hasAnyLogoVariant = (
  variants: LogoVariants,
  legacyKey?: string | null,
): boolean => {
  if (legacyKey?.trim()) return true;
  return logoVariantValues.some((variant) => Boolean(variants[variant]?.trim()));
};
