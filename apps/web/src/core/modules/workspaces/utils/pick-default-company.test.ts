import { describe, expect, it } from "vitest";

import {
  isPlatformAdminRole,
  pickDefaultOnboardedCompany,
} from "./pick-default-company";

describe("pickDefaultOnboardedCompany", () => {
  const companies = [
    {
      id: "co_1",
      name: "Alpha",
      slug: "alpha",
      onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "co_2",
      name: "Beta",
      slug: "beta",
      onboardingCompletedAt: "2026-01-02T00:00:00.000Z",
    },
    {
      id: "co_3",
      name: "Gamma",
      slug: "gamma",
      onboardingCompletedAt: null,
    },
  ];

  it("keeps a valid active company", () => {
    expect(pickDefaultOnboardedCompany(companies, "co_2")?.id).toBe("co_2");
  });

  it("falls back to the first onboarded company", () => {
    expect(pickDefaultOnboardedCompany(companies, null)?.id).toBe("co_1");
  });

  it("replaces an invalid active company", () => {
    expect(pickDefaultOnboardedCompany(companies, "missing")?.id).toBe("co_1");
  });
});

describe("isPlatformAdminRole", () => {
  it("detects platform admin roles", () => {
    expect(isPlatformAdminRole(["platform_admin"])).toBe(true);
    expect(isPlatformAdminRole(["platform_owner"])).toBe(true);
    expect(isPlatformAdminRole(["member"])).toBe(false);
  });
});
