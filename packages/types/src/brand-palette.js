"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeBrandPalette = exports.createDefaultBrandPalette = exports.brandPaletteSchema = exports.brandColorEntrySchema = exports.brandColorHexSchema = void 0;
const zod_1 = require("zod");
exports.brandColorHexSchema = zod_1.z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Invalid hex color');
exports.brandColorEntrySchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1).max(80),
    hex: exports.brandColorHexSchema,
    description: zod_1.z.string().max(500).nullable().optional(),
});
exports.brandPaletteSchema = zod_1.z.object({
    primary: exports.brandColorEntrySchema,
    secondary: exports.brandColorEntrySchema,
    additional: zod_1.z.array(exports.brandColorEntrySchema).max(8),
});
const createDefaultBrandPalette = () => ({
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
exports.createDefaultBrandPalette = createDefaultBrandPalette;
const normalizeBrandPalette = (raw) => {
    if (raw &&
        typeof raw === 'object' &&
        !Array.isArray(raw) &&
        'primary' in raw &&
        'secondary' in raw) {
        const parsed = exports.brandPaletteSchema.safeParse(raw);
        if (parsed.success)
            return parsed.data;
    }
    if (Array.isArray(raw)) {
        const colors = raw.filter((item) => typeof item === 'string');
        const defaults = (0, exports.createDefaultBrandPalette)();
        return {
            primary: {
                ...defaults.primary,
                hex: colors[0] && exports.brandColorHexSchema.safeParse(colors[0]).success
                    ? colors[0]
                    : defaults.primary.hex,
            },
            secondary: {
                ...defaults.secondary,
                hex: colors[1] && exports.brandColorHexSchema.safeParse(colors[1]).success
                    ? colors[1]
                    : defaults.secondary.hex,
            },
            additional: colors.slice(2).map((hex, index) => ({
                id: `additional-${index}-${hex.replace('#', '')}`,
                name: '',
                hex: exports.brandColorHexSchema.safeParse(hex).success ? hex : '#000000',
                description: null,
            })),
        };
    }
    return (0, exports.createDefaultBrandPalette)();
};
exports.normalizeBrandPalette = normalizeBrandPalette;
