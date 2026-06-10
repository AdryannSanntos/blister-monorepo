import { normalizeBrandAssets, normalizeLogoVariants } from '@company-os/types';

import type { AssetResolver, BrandProfile } from '@company-os/agent-sdk';

export interface ResolvedAsset {
  label: string;
  url: string;
  kind: 'logo' | 'asset';
}

const LOGO_VARIANT_LABELS: Record<string, string> = {
  primary: 'Logo principal',
  horizontal: 'Logo horizontal',
  icon: 'Ícone da marca',
  monochrome: 'Logo monocromática',
};

/**
 * Collects every brand image (logo variants, legacy logo, brand assets) and
 * resolves their storage keys into signed URLs. Returns only the images that
 * resolved successfully, so the prompt never references a broken `<img>`.
 *
 * Signed URLs are short-lived: they power the immediate preview in the chat.
 * Saved runs may show expired images in history — acceptable for the preview
 * use case.
 */
export async function resolveBrandAssets(
  brandProfile: BrandProfile | null,
  assetResolver: AssetResolver | null,
): Promise<ResolvedAsset[]> {
  if (!brandProfile || !assetResolver) return [];

  const logoVariants = normalizeLogoVariants(brandProfile.logoVariants);
  const brandAssets = normalizeBrandAssets(brandProfile.brandAssets);

  // Build the (key → descriptor) plan, de-duplicating keys.
  const planned: Array<{ key: string; label: string; kind: 'logo' | 'asset' }> = [];
  const seenKeys = new Set<string>();

  const push = (key: string | null | undefined, label: string, kind: 'logo' | 'asset'): void => {
    const trimmed = typeof key === 'string' ? key.trim() : '';
    if (!trimmed || seenKeys.has(trimmed)) return;
    seenKeys.add(trimmed);
    planned.push({ key: trimmed, label, kind });
  };

  for (const [variant, key] of Object.entries(logoVariants)) {
    push(key, LOGO_VARIANT_LABELS[variant] ?? `Logo (${variant})`, 'logo');
  }
  push(brandProfile.logoStorageKey, 'Logo principal', 'logo');
  for (const asset of brandAssets) {
    push(asset.storageKey, asset.name || 'Imagem da marca', 'asset');
  }

  if (planned.length === 0) return [];

  let urlByKey: Record<string, string> = {};
  try {
    urlByKey = await assetResolver(planned.map((item) => item.key));
  } catch {
    return [];
  }

  return planned.flatMap((item) => {
    const url = urlByKey[item.key];
    return url ? [{ label: item.label, url, kind: item.kind }] : [];
  });
}
