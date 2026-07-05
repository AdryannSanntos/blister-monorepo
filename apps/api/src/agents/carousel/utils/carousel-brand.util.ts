import {
  carouselAgentSettingsSchema,
  carouselBrandContextSchema,
  type CarouselBrandContext,
  type CarouselBrandOverrides,
} from '@company-os/types';

export { buildAccentCssOverride } from './brand-theme.util';

const DEFAULT_BRAND_NAME = 'Blister';
const DEFAULT_HANDLE = '@blister';
const DEFAULT_ACCENT = '#563BE7';

export const normalizeInstagramHandle = (handle?: string): string | undefined => {
  if (!handle) return undefined;
  const trimmed = handle.trim();
  if (!trimmed) return undefined;
  return trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
};

export const formatMetaRight = (brand: CarouselBrandContext): string => {
  if (brand.metaRightMode === 'date') {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  }
  return brand.instagramHandle;
};

type ResolveBrandInput = {
  brandOverrides?: CarouselBrandOverrides;
  agentSettings?: unknown;
  workspaceDisplayName?: string;
  workspacePalette?: string[];
};

export const resolveCarouselBrandContext = (input: ResolveBrandInput): CarouselBrandContext => {
  const settings = carouselAgentSettingsSchema.parse(input.agentSettings ?? {});

  const brandName =
    input.brandOverrides?.brandName ??
    settings.brandName ??
    input.workspaceDisplayName ??
    DEFAULT_BRAND_NAME;

  const instagramHandle =
    normalizeInstagramHandle(input.brandOverrides?.instagramHandle) ??
    normalizeInstagramHandle(settings.instagramHandle) ??
    DEFAULT_HANDLE;

  const accentColor =
    input.brandOverrides?.accentColor ??
    settings.accentColor ??
    input.workspacePalette?.[0] ??
    DEFAULT_ACCENT;

  return carouselBrandContextSchema.parse({
    brandName,
    instagramHandle,
    accentColor: accentColor.toUpperCase(),
    metaRightMode: settings.metaRightMode,
  });
};
