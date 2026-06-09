import { routing, type AppLocale } from "./routing";

const localeSet = new Set<string>(routing.locales);

export function stripLocalePrefix(pathname: string): {
  locale: AppLocale | null;
  pathname: string;
} {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { locale: null, pathname: "/" };
  }

  const maybeLocale = segments[0];

  if (localeSet.has(maybeLocale)) {
    const rest = segments.slice(1).join("/");
    return {
      locale: maybeLocale as AppLocale,
      pathname: rest ? `/${rest}` : "/",
    };
  }

  return { locale: null, pathname };
}

export function withLocalePrefix(
  pathname: string,
  locale: AppLocale | null,
): string {
  if (!locale || locale === routing.defaultLocale) {
    return pathname;
  }

  if (pathname === "/") {
    return `/${locale}`;
  }

  return `/${locale}${pathname}`;
}
