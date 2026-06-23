export const getAgentBasePath = (routeSlug: string) =>
  `/dashboard/agents/${routeSlug}`;

export const getAgentOverviewPath = (routeSlug: string) =>
  `${getAgentBasePath(routeSlug)}/overview`;

export const getAgentHistoryPath = (routeSlug: string) =>
  `${getAgentBasePath(routeSlug)}/history`;

export const getAgentNewPath = (routeSlug: string) =>
  `${getAgentBasePath(routeSlug)}/new`;

export const getAgentSettingsPath = (routeSlug: string) =>
  `${getAgentBasePath(routeSlug)}/settings`;

export const getAgentRunPath = (routeSlug: string, runId: string) =>
  `${getAgentBasePath(routeSlug)}/runs/${runId}`;

export const matchAgentPath = (pathname: string, routeSlug: string) =>
  pathname.startsWith(getAgentBasePath(routeSlug));

export const matchAgentOverviewPath = (pathname: string, routeSlug: string) =>
  pathname === getAgentOverviewPath(routeSlug) ||
  pathname === getAgentBasePath(routeSlug);

export const matchAgentHistoryPath = (pathname: string, routeSlug: string) =>
  pathname === getAgentHistoryPath(routeSlug);

export const matchAgentNewPath = (pathname: string, routeSlug: string) =>
  pathname === getAgentNewPath(routeSlug);

export const matchAgentSettingsPath = (pathname: string, routeSlug: string) =>
  pathname === getAgentSettingsPath(routeSlug);

export const parseAgentRouteSlug = (pathname: string): string | null => {
  const prefix = "/dashboard/agents/";
  if (!pathname.startsWith(prefix)) return null;
  const slug = pathname.slice(prefix.length).split("/")[0];
  return slug || null;
};

export const parseAgentRunId = (pathname: string): string | null => {
  const match = pathname.match(/^\/dashboard\/agents\/[^/]+\/runs\/([^/]+)\/?$/);
  return match?.[1] ?? null;
};

export const matchAgentRunPath = (pathname: string, routeSlug: string): boolean =>
  parseAgentRunId(pathname) !== null &&
  pathname.startsWith(`${getAgentBasePath(routeSlug)}/runs/`);
