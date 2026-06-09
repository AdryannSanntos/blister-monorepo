import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { stripLocalePrefix, withLocalePrefix } from "./i18n/locale-path";
import { routing } from "./i18n/routing";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PREFIX = "/dashboard";
const WORKSPACES_PREFIX = "/workspaces";
const ONBOARDING_PATH = "/onboarding";
const AUTH_API_PREFIX = "/api/auth";
const SYSTEM_PREFIX = "/system";
const PUBLIC_ROUTE_PREFIXES = [AUTH_PREFIX, SYSTEM_PREFIX];
const ACTIVE_COMPANY_COOKIE = "blister-active-company-id";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

type HomeDestination = "onboarding" | "dashboard" | "workspaces";

type HomeDestinationResponse = {
  destination: HomeDestination;
  companyCount: number;
  onboardedCount: number;
};

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

function destinationToPath(destination: HomeDestination) {
  switch (destination) {
    case "onboarding":
      return ONBOARDING_PATH;
    case "workspaces":
      return WORKSPACES_PREFIX;
    default:
      return DASHBOARD_PREFIX;
  }
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

  if (!response.ok) {
    return null;
  }

  return response.json();
}

async function getHomeDestination(
  request: NextRequest,
): Promise<HomeDestinationResponse | null> {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/companies/home-destination`,
      {
        method: "GET",
        headers: {
          cookie: request.headers.get("cookie") ?? "",
          accept: "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as HomeDestinationResponse;
  } catch {
    return null;
  }
}

async function companyBelongsToUser(
  request: NextRequest,
  companyId: string,
): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/companies`, {
      method: "GET",
      headers: {
        cookie: request.headers.get("cookie") ?? "",
        accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) return false;

    const companies = (await response.json()) as Array<{ id: string }>;
    return companies.some((company) => company.id === companyId);
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith(AUTH_API_PREFIX) ||
    pathname.startsWith(SYSTEM_PREFIX)
  ) {
    return NextResponse.next();
  }

  const intlResponse = handleI18nRouting(request);

  if (intlResponse.status >= 300 && intlResponse.status < 400) {
    return intlResponse;
  }

  const { pathname: localizedPathname } = stripLocalePrefix(
    request.nextUrl.pathname,
  );

  try {
    const session = await getSession(request);
    const isAuthenticated = Boolean(session?.session && session?.user);
    const isAuthRoute = localizedPathname.startsWith(AUTH_PREFIX);
    const isDashboardRoute = localizedPathname.startsWith(DASHBOARD_PREFIX);
    const isWorkspacesRoute = localizedPathname.startsWith(WORKSPACES_PREFIX);
    const isOnboardingRoute = localizedPathname === ONBOARDING_PATH;
    const isNewCompanyOnboarding =
      request.nextUrl.searchParams.get("new") === "1";

    if (localizedPathname === "/") {
      if (!isAuthenticated) {
        return redirect(request, `${AUTH_PREFIX}/login`);
      }

      const home = await getHomeDestination(request);
      return redirect(
        request,
        home ? destinationToPath(home.destination) : DASHBOARD_PREFIX,
      );
    }

    if (!isAuthenticated) {
      if (!isPublicRoute(localizedPathname)) {
        return redirect(request, buildLoginRedirectPath(request));
      }
      return intlResponse;
    }

    const home = await getHomeDestination(request);
    const homePath = home
      ? destinationToPath(home.destination)
      : DASHBOARD_PREFIX;

    if (isAuthRoute) {
      return redirect(request, homePath);
    }

    if (isOnboardingRoute) {
      if (isNewCompanyOnboarding) {
        return intlResponse;
      }

      if (home && home.destination !== "onboarding") {
        return redirect(request, homePath);
      }

      return intlResponse;
    }

    if (isDashboardRoute) {
      if (!home || home.destination === "onboarding") {
        return redirect(request, ONBOARDING_PATH);
      }

      if (home.destination === "workspaces") {
        const activeCompanyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value;
        if (!activeCompanyId) {
          return redirect(request, WORKSPACES_PREFIX);
        }

        const isValid = await companyBelongsToUser(request, activeCompanyId);
        if (!isValid) {
          return redirect(request, WORKSPACES_PREFIX);
        }
      }

      return intlResponse;
    }

    if (isWorkspacesRoute) {
      const isAdminRoute = localizedPathname.startsWith(
        `${WORKSPACES_PREFIX}/admin`,
      );

      if (isAdminRoute) {
        return intlResponse;
      }

      if (home?.destination === "onboarding") {
        return redirect(request, ONBOARDING_PATH);
      }

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
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
