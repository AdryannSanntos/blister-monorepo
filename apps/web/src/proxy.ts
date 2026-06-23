import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { stripLocalePrefix, withLocalePrefix } from "./i18n/locale-path";
import { routing } from "./i18n/routing";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PREFIX = "/dashboard";
const WORKSPACES_PREFIX = "/workspaces";
const ADMIN_PREFIX = "/admin";
const ONBOARDING_PATH = "/onboarding";
const AUTH_API_PREFIX = "/api/auth";
const API_PREFIX = "/api";
const SYSTEM_PREFIX = "/system";
const PUBLIC_ROUTE_PREFIXES = [AUTH_PREFIX, SYSTEM_PREFIX];
const ACTIVE_COMPANY_COOKIE = "blister-active-company-id";
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

  if (!response.ok) {
    return null;
  }

  return response.json();
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

  try {
    const session = await getSession(request);
    const isAuthenticated = Boolean(session?.session && session?.user);
    const isAuthRoute = localizedPathname.startsWith(AUTH_PREFIX);
    const isDashboardRoute = localizedPathname.startsWith(DASHBOARD_PREFIX);
    const isWorkspacesRoute = localizedPathname.startsWith(WORKSPACES_PREFIX);
    const isAdminRoute = localizedPathname.startsWith(ADMIN_PREFIX);

    // O destino padrão de todo usuário autenticado é o Espaço Pessoal
    // (/dashboard). Criar empresa é opcional e fica em /onboarding — nunca
    // forçamos o onboarding aqui.
    if (localizedPathname === "/") {
      return redirect(
        request,
        isAuthenticated ? DASHBOARD_PREFIX : `${AUTH_PREFIX}/login`,
      );
    }

    if (!isAuthenticated) {
      if (!isPublicRoute(localizedPathname)) {
        return redirect(request, buildLoginRedirectPath(request));
      }
      return intlResponse;
    }

    if (isAuthRoute) {
      return redirect(request, DASHBOARD_PREFIX);
    }

    // /onboarding é o fluxo opt-in de criação de empresa: sempre acessível
    // para usuários autenticados.
    if (localizedPathname === ONBOARDING_PATH) {
      return intlResponse;
    }

    if (isWorkspacesRoute) {
      if (localizedPathname.startsWith(`${WORKSPACES_PREFIX}/admin`)) {
        return redirect(request, ADMIN_PREFIX);
      }
      return redirect(request, DASHBOARD_PREFIX);
    }

    if (isDashboardRoute) {
      // Limpa o cookie de empresa ativa se apontar para uma empresa que não
      // pertence mais ao usuário — cai de volta no Espaço Pessoal.
      const activeCompanyId = request.cookies.get(ACTIVE_COMPANY_COOKIE)?.value;
      if (
        activeCompanyId &&
        activeCompanyId !== "personal" &&
        activeCompanyId !== "__personal__"
      ) {
        const isValid = await companyBelongsToUser(request, activeCompanyId);
        if (!isValid) {
          const response = intlResponse;
          response.cookies.delete(ACTIVE_COMPANY_COOKIE);
          return response;
        }
      }

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
    // Skip static assets (fonts, images, etc.) — paths with a file extension.
    "/((?!_next/static|_next/image|_vercel|.*\\..*).*)",
  ],
};
