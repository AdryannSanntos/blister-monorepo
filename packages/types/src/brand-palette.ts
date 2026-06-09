import { z } from 'zod';

export const brandColorHexSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color');

export const brandColorEntrySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  hex: brandColorHexSchema,
  description: z.string().max(500).nullable().optional(),
});

export type BrandColorEntry = z.infer<typeof brandColorEntrySchema>;

export const brandPaletteSchema = z.object({
  primary: brandColorEntrySchema,
  secondary: brandColorEntrySchema,
  additional: z.array(brandColorEntrySchema).max(8),
});

export type BrandPalette = z.infer<typeof brandPaletteSchema>;

export const createDefaultBrandPalette = (): BrandPalette => ({
  primary: {
    id: 'primary',
    name: '',
    hex: '#563BE7',
    description: null,
  },
  secondary: {
    id: 'secondary',
    name: '',
    hex: '#F83B87',
    description: null,
  },
  additional: [],
});

export const normalizeBrandPalette = (raw: unknown): BrandPalette => {
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'primary' in raw &&
    'secondary' in raw
  ) {
    const parsed = brandPaletteSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  }

  if (Array.isArray(raw)) {
    const colors = raw.filter(
      (item): item is string => typeof item === 'string',
    );
    const defaults = createDefaultBrandPalette();

    return {
      primary: {
        ...defaults.primary,
        hex:
          colors[0] && brandColorHexSchema.safeParse(colors[0]).success
            ? colors[0]
            : defaults.primary.hex,
      },
      secondary: {
        ...defaults.secondary,
        hex:
          colors[1] && brandColorHexSchema.safeParse(colors[1]).success
            ? colors[1]
            : defaults.secondary.hex,
      },
      additional: colors.slice(2).map((hex, index) => ({
        id: `additional-${index}-${hex.replace('#', '')}`,
        name: '',
        hex: brandColorHexSchema.safeParse(hex).success ? hex : '#000000',
        description: null,
      })),
    };
  }

  return createDefaultBrandPalette();
};
