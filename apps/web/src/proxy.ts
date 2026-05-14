import { type NextRequest, NextResponse } from "next/server";

const AUTH_PREFIX = "/auth";
const DASHBOARD_PREFIX = "/dashboard";
const ONBOARDING_PREFIX = "/onboarding";
const WORKSPACE_PREFIX = "/workspace";
const WORKSPACE_CREATE_PATH = "/workspace/create";
const WORKSPACE_SELECT_PATH = "/workspace/select";
const INVITE_ACCEPT_PATH = "/invite/accept";
const APP_PREFIX = "/app";
const AUTH_API_PREFIX = "/api/auth";
const ACTIVE_ORG_COOKIE = "company-os-active-org";
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

type SessionPayload = {
  session?: unknown;
  user?: { id?: string };
};

type OrganizationSummary = {
  id: string;
};

type OnboardingStatus = {
  published: boolean;
};

function redirect(request: NextRequest, pathname: string) {
  return NextResponse.redirect(new URL(pathname, request.url));
}

function buildLoginRedirectPath(request: NextRequest) {
  const next = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  return `/auth/login?next=${encodeURIComponent(next)}`;
}

function withActiveOrgCookie(response: NextResponse, orgId: string | null) {
  if (orgId) {
    response.cookies.set(ACTIVE_ORG_COOKIE, orgId, {
      path: "/",
      sameSite: "lax",
    });
  } else {
    response.cookies.delete(ACTIVE_ORG_COOKIE);
  }

  return response;
}

async function fetchApiJson<T>(pathname: string) {
  const response = await fetch(`${API_BASE_URL}/api${pathname}`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as T;
}

async function getSession(request: NextRequest) {
  const response = await fetch(
    new URL(`${AUTH_API_PREFIX}/get-session`, request.url),
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

async function resolveAuthenticatedState(userId: string, activeOrgId: string | null) {
  const organizations =
    (await fetchApiJson<OrganizationSummary[]>(`/organizations/user/${userId}`)) ?? [];

  if (organizations.length === 0) {
    return {
      destination: WORKSPACE_CREATE_PATH,
      activeOrgId: null,
      organizations,
      onboardingPublished: null,
    };
  }

  const validActiveOrgId = organizations.some((org) => org.id === activeOrgId)
    ? activeOrgId
    : null;
  const resolvedActiveOrgId =
    validActiveOrgId ?? (organizations.length === 1 ? organizations[0].id : null);

  if (!resolvedActiveOrgId) {
    return {
      destination: WORKSPACE_SELECT_PATH,
      activeOrgId: null,
      organizations,
      onboardingPublished: null,
    };
  }

  const onboardingStatus = await fetchApiJson<OnboardingStatus>(
    `/organizations/${resolvedActiveOrgId}/onboarding/status`,
  );

  const onboardingPublished = onboardingStatus?.published ?? true;

  return {
    destination: onboardingPublished ? DASHBOARD_PREFIX : ONBOARDING_PREFIX,
    activeOrgId: resolvedActiveOrgId,
    organizations,
    onboardingPublished,
  };
}

function shouldAllowRoute(pathname: string, destination: string, onboardingPublished: boolean | null) {
  if (pathname.startsWith(WORKSPACE_CREATE_PATH) || pathname.startsWith(WORKSPACE_SELECT_PATH)) {
    return true;
  }

  if (pathname.startsWith(ONBOARDING_PREFIX)) {
    return onboardingPublished === false;
  }

  if (pathname.startsWith(DASHBOARD_PREFIX)) {
    return onboardingPublished !== false;
  }

  if (pathname.startsWith(APP_PREFIX)) {
    return false;
  }

  return pathname.startsWith(destination);
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(AUTH_API_PREFIX)) {
    return NextResponse.next();
  }

  const session = await getSession(request);
  const isAuthenticated = Boolean(session?.session && session?.user);
  const isAuthRoute = pathname.startsWith(AUTH_PREFIX);
  const isDashboardRoute = pathname.startsWith(DASHBOARD_PREFIX);
  const isOnboardingRoute = pathname.startsWith(ONBOARDING_PREFIX);
  const isWorkspaceRoute = pathname.startsWith(WORKSPACE_PREFIX);
  const isInviteAcceptRoute = pathname.startsWith(INVITE_ACCEPT_PATH);
  const isAppRoute = pathname.startsWith(APP_PREFIX);
  const activeOrgId = request.cookies.get(ACTIVE_ORG_COOKIE)?.value ?? null;

  if (pathname === "/") {
    return redirect(request, isAuthenticated ? APP_PREFIX : "/auth/login");
  }

  if (!isAuthenticated) {
    if (isDashboardRoute || isOnboardingRoute || isWorkspaceRoute || isAppRoute) {
      return redirect(request, buildLoginRedirectPath(request));
    }

    return isAuthRoute || isInviteAcceptRoute
      ? NextResponse.next()
      : redirect(request, "/auth/login");
  }

  const userId = (session as SessionPayload).user?.id;

  if (!userId) {
    return redirect(request, "/auth/login");
  }

  const state = await resolveAuthenticatedState(userId, activeOrgId);
  const responseDestination =
    isAuthRoute || isAppRoute ? state.destination : pathname;

  if (isAuthRoute) {
    return withActiveOrgCookie(redirect(request, state.destination), state.activeOrgId);
  }

  if (isInviteAcceptRoute) {
    return withActiveOrgCookie(NextResponse.next(), state.activeOrgId);
  }

  if (isDashboardRoute || isOnboardingRoute || isWorkspaceRoute || isAppRoute) {
    if (
      !shouldAllowRoute(
        pathname,
        responseDestination,
        state.onboardingPublished,
      )
    ) {
      return withActiveOrgCookie(
        redirect(request, state.destination),
        state.activeOrgId,
      );
    }

    return withActiveOrgCookie(NextResponse.next(), state.activeOrgId);
  }

  return withActiveOrgCookie(redirect(request, state.destination), state.activeOrgId);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
