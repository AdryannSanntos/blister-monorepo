import { PERSONAL_WORKSPACE_ID } from "@company-os/types";

export const ACTIVE_WORKSPACE_COOKIE = "blister-active-company-id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getActiveWorkspaceId(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ACTIVE_WORKSPACE_COOKIE}=`));

  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "") || null;
}

export function isPersonalWorkspace(workspaceId: string | null | undefined): boolean {
  return (
    !workspaceId ||
    workspaceId === PERSONAL_WORKSPACE_ID ||
    workspaceId === "personal"
  );
}

export function setActiveWorkspaceId(workspaceId: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${encodeURIComponent(workspaceId)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function setPersonalWorkspace() {
  setActiveWorkspaceId(PERSONAL_WORKSPACE_ID);
}

export function clearActiveWorkspaceId() {
  if (typeof document === "undefined") return;

  document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** @deprecated Use setActiveWorkspaceId */
export const setActiveCompanyId = setActiveWorkspaceId;

/** @deprecated Use getActiveWorkspaceId */
export const getActiveCompanyId = getActiveWorkspaceId;

/** @deprecated Use clearActiveWorkspaceId */
export const clearActiveCompanyId = clearActiveWorkspaceId;

export const ACTIVE_COMPANY_COOKIE = ACTIVE_WORKSPACE_COOKIE;
