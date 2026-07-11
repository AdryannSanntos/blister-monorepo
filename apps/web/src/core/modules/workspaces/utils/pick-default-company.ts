import type { CompanyOption } from "../hooks/use-workspace-context";

export const pickDefaultOnboardedCompany = (
  companies: CompanyOption[],
  activeId: string | null,
): CompanyOption | null => {
  const onboarded = companies.filter((company) => company.onboardingCompletedAt);
  if (onboarded.length === 0) return null;

  if (activeId) {
    const selected = onboarded.find((company) => company.id === activeId);
    if (selected) return selected;
  }

  return onboarded[0] ?? null;
};

export const pickDefaultCompany = (
  companies: CompanyOption[],
  activeId: string | null,
): CompanyOption | null => {
  if (companies.length === 0) return null;

  if (activeId) {
    const selected = companies.find((company) => company.id === activeId);
    if (selected) return selected;
  }

  return pickDefaultOnboardedCompany(companies, null) ?? companies[0] ?? null;
};

export const isPlatformAdminRole = (roles: string[]): boolean =>
  roles.includes("platform_owner") || roles.includes("platform_admin");
