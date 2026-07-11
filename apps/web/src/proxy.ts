import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { stripLocalePrefix, withLocalePrefix } from "./i18n/locale-path";
import { routing } from "./i18n/routing";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PREFIX = "/dashboard";
const ADMIN_PREFIX = "/admin";
const AUTH_API_PREFIX = "/api/auth";
const API_PREFIX = "/api";
const SYSTEM_PREFIX = "/system";
const PUBLIC_ROUTE_PREFIXES = [AUTH_PREFIX, SYSTEM_PREFIX];
const ACTIVE_COMPANY_COOKIE = "blister-active-company-id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

const handleI18nRouting = createIntlMiddleware(routing);

function redirect(request: NextRequest, pathname: string) {
  const { locale } = stripLocalePrefix(request.nextUrl.pathname);
  const localizedPath = withLocalePrefix(pathname, locale);
  return NextResponse.redirect(new URL(localizedPath, request.url));
}

function buildLoginRedirectPath(request: NextRequest) {
  const { pathname } = stripLocalePrefix(request.nextUrl.pathname);
  const next = `${pathname}${request.nextUrl.search}`;
  return `${AUTH_PREFIX}/login?next=${encodeURIComponent(next)}`;
}

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function getSession(request: NextRequest) {
  const response = await fetch(
    `${API_BASE_URL}${AUTH_API_PREFIX}/get-session`,
    {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;
  return response.json();
}

async function fetchUserCompanies(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    return (await response.json()) as Array<{
      id: string;
      onboardingCompletedAt: string | null;
    }>;
  } catch {
    return [];
  }
}

async function fetchPlatformRoles(request: NextRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/platform/me/roles`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return [];

    const assignments = (await response.json()) as Array<{ role: string }>;
    return assignments.map((assignment) => assignment.role);
  } catch {
    return [];
  }
}

function isPlatformAdminRole(roles: string[]) {
  return roles.includes("platform_owner") || roles.includes("platform_admin");
}

async function resolveAuthenticatedLandingPath(request: NextRequest) {
  const roles = await fetchPlatformRoles(request);
  if (isPlatformAdminRole(roles)) return ADMIN_PREFIX;
  return DASHBOARD_PREFIX;
}

function pickDefaultCompanyId(
  companies: Array<{ id: string; onboardingCompletedAt: string | null }>,
) {
  const onboarded = companies.filter((company) => company.onboardingCompletedAt);
  return onboarded[0]?.id ?? companies[0]?.id ?? null;
}

function attachActiveCompanyCookieIfMissing(
  request: NextRequest,
  response: NextResponse,
  companies: Array<{ id: string; onboardingCompletedAt: string | null }>,
) {
  const activeCompanyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value;
  const hasValidActiveCompany =
    Boolean(activeCompanyId) &&
    activeCompanyId !== "personal" &&
    activeCompanyId !== "__personal__" &&
    companies.some((company) => company.id === activeCompanyId);

  if (hasValidActiveCompany) return;

  const defaultCompanyId = pickDefaultCompanyId(companies);
  if (defaultCompanyId) {
    response.cookies.set(ACTIVE_COMPANY_COOKIE, defaultCompanyId, {
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
      sameSite: "lax",
    });
    return;
  }

  if (activeCompanyId) {
    response.cookies.delete(ACTIVE_COMPANY_COOKIE);
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(API_PREFIX) || pathname.startsWith(SYSTEM_PREFIX)) {
    return NextResponse.next();
  }

  const intlResponse = handleI18nRouting(request);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const { pathname: localizedPathname } = stripLocalePrefix(
    request.nextUrl.pathname,
  );

  // Signup is invite-only — redirect to login
  if (localizedPathname === "/auth/signup") {
    return redirect(request, `${AUTH_PREFIX}/login`);
  }

  try {
    const session = await getSession(request);
    const isAuthenticated = Boolean(session?.session && session?.user);
    const isAuthRoute = localizedPathname.startsWith(AUTH_PREFIX);
    const isDashboardRoute = localizedPathname.startsWith(DASHBOARD_PREFIX);
    const isAdminRoute = localizedPathname.startsWith(ADMIN_PREFIX);

    if (localizedPathname === "/") {
      return redirect(
        request,
        isAuthenticated
          ? await resolveAuthenticatedLandingPath(request)
          : `${AUTH_PREFIX}/login`,
      );
    }

    if (!isAuthenticated) {
      if (!isPublicRoute(localizedPathname)) {
        return redirect(request, buildLoginRedirectPath(request));
      }
      return intlResponse;
    }

    if (isAuthRoute) {
      return redirect(request, await resolveAuthenticatedLandingPath(request));
    }

    if (isDashboardRoute) {
      const companies = await fetchUserCompanies(request);
      attachActiveCompanyCookieIfMissing(request, intlResponse, companies);
      return intlResponse;
    }

    if (isAdminRoute) {
      return intlResponse;
    }

    return intlResponse;
  } catch (error) {
    console.error("Proxy failed to resolve request state", error);

    if (!isPublicRoute(localizedPathname)) {
      return redirect(request, buildLoginRedirectPath(request));
    }

    return intlResponse;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_vercel|.*\\..*).*)",
  ],
};
