export const ACTIVE_COMPANY_COOKIE = "blister-active-company-id";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getActiveCompanyId(): string | null {
  if (typeof document === "undefined") return null;

  const match = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${ACTIVE_COMPANY_COOKIE}=`));

  if (!match) return null;
  return decodeURIComponent(match.split("=")[1] ?? "") || null;
}

export function setActiveCompanyId(companyId: string) {
  if (typeof document === "undefined") return;

  document.cookie = `${ACTIVE_COMPANY_COOKIE}=${encodeURIComponent(companyId)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function clearActiveCompanyId() {
  if (typeof document === "undefined") return;

  document.cookie = `${ACTIVE_COMPANY_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
