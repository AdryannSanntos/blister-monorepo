const COMPANY_PREFIX = 'companies/';

/**
 * S3 layout per company:
 * companies/{slug}/logos/{variant}/...
 * companies/{slug}/assets/...
 * companies/{slug}/references/...
 * companies/{slug}/context/...
 */

export type CompanyStorageScope = {
  slug: string;
  isPending: boolean;
};

export function companyScopePrefix(slug: string): string {
  return `${COMPANY_PREFIX}${slug}/`;
}

export function pendingCompanyScopePrefix(userId: string): string {
  return `${COMPANY_PREFIX}_pending/${userId}/`;
}

export function sanitizeKeyHint(hint: string): string {
  return hint
    .replace(/\.\.+/g, '')
    .replace(/[^a-zA-Z0-9/_.-]/g, '-')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '');
}

export function extractCompanySlugFromKey(key: string): string | null {
  if (!key.startsWith(COMPANY_PREFIX)) return null;
  const rest = key.slice(COMPANY_PREFIX.length);
  const slashIndex = rest.indexOf('/');
  if (slashIndex === -1) return rest || null;
  return rest.slice(0, slashIndex) || null;
}

export function isKeyInCompanyScope(key: string, slug: string): boolean {
  return key.startsWith(companyScopePrefix(slug));
}

export function isKeyInPendingScope(key: string, userId: string): boolean {
  return key.startsWith(pendingCompanyScopePrefix(userId));
}

export function buildLogoKeyHint(
  variant: string,
  filename: string,
): string {
  return sanitizeKeyHint(`logos/${variant}/${Date.now()}-${filename}`);
}

export function buildAssetKeyHint(filename: string): string {
  return sanitizeKeyHint(`assets/${Date.now()}-${filename}`);
}
